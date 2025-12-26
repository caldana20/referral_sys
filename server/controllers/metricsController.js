const { Op, fn, col, literal } = require('sequelize');
const { Referral, Estimate, User, RewardSetting, sequelize } = require('../models');
const Tenant = require('../models').Tenant;

exports.getDashboardMetrics = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.tenant?.tenantId;
    if (!tenantId) return res.status(400).json({ message: 'Tenant context is required' });

    const since = new Date();
    since.setDate(since.getDate() - 84); // ~12 weeks

    // Summary counts
    const [totalReferrals, openCount, closedCount, usedCount, totalEstimates] = await Promise.all([
      Referral.count({ where: { tenantId } }),
      Referral.count({ where: { tenantId, status: 'Open' } }),
      Referral.count({ where: { tenantId, status: 'Closed' } }),
      Estimate.count({
        distinct: true,
        col: 'referralId',
        include: [{ model: Referral, where: { tenantId } }]
      }),
      Estimate.count({ include: [{ model: Referral, where: { tenantId } }] })
    ]);

    const conversionRate = totalReferrals > 0 ? Math.round((usedCount / totalReferrals) * 100) : 0;

    // Trends (weekly, last ~12 weeks)
    const referrals = await Referral.findAll({
      where: { tenantId, createdAt: { [Op.gte]: since } },
      attributes: ['id', 'status', 'createdAt'],
      include: [{ model: Estimate, attributes: ['id'] }]
    });

    const trendMap = {};
    referrals.forEach((r) => {
      const d = new Date(r.createdAt);
      // normalize to start of week (Monday) in UTC
      d.setUTCHours(0, 0, 0, 0);
      const day = d.getUTCDay(); // 0=Sun ... 6=Sat
      const diff = day === 0 ? 6 : day - 1; // move back to Monday
      d.setUTCDate(d.getUTCDate() - diff);
      const week = d.toISOString().slice(0, 10);
      if (!trendMap[week]) trendMap[week] = { open: 0, used: 0, closed: 0 };
      if (r.status === 'Closed') trendMap[week].closed += 1;
      else if (r.Estimates && r.Estimates.length > 0) trendMap[week].used += 1;
      else trendMap[week].open += 1;
    });
    const trends = Object.entries(trendMap)
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([weekStart, counts]) => ({ weekStart, ...counts }));

    // Top referrers (clients)
    const topReferrers = await Referral.findAll({
      where: { tenantId },
      attributes: [
        'userId',
        [fn('COUNT', col('Referral.id')), 'count']
      ],
      include: [{ model: User, attributes: ['name', 'email'] }],
      group: ['userId', 'User.id'],
      order: [[literal('count'), 'DESC']],
      limit: 5
    });

    // Top rewards
    const topRewards = await Referral.findAll({
      where: { tenantId, selectedReward: { [Op.ne]: null } },
      attributes: ['selectedReward', [fn('COUNT', col('Referral.id')), 'count']],
      group: ['selectedReward'],
      order: [[literal('count'), 'DESC']],
      limit: 5
    });

    res.json({
      summary: {
        totalReferrals,
        openCount,
        usedCount,
        closedCount,
        totalEstimates,
        conversionRate
      },
      trends,
      topReferrers: topReferrers.map((r) => ({
        userId: r.userId,
        name: r.User?.name || 'Unknown',
        email: r.User?.email || '',
        count: Number(r.get('count') || 0)
      })),
      topRewards: topRewards.map((r) => ({
        reward: r.selectedReward,
        count: Number(r.get('count') || 0)
      }))
    });
  } catch (err) {
    console.error('Metrics dashboard error:', err);
    res.status(500).json({ message: 'Failed to load metrics', error: err.message });
  }
};

exports.getRecommendations = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.tenant?.tenantId;
    if (!tenantId) return res.status(400).json({ message: 'Tenant context is required' });

    const [clientCount, referralCounts, estimateCount, rewardCount] = await Promise.all([
      User.count({ where: { tenantId, role: 'client' } }),
      Referral.findAll({
        where: { tenantId },
        attributes: [
          [fn('COUNT', col('Referral.id')), 'total'],
          [fn('SUM', literal(`CASE WHEN status = 'Open' THEN 1 ELSE 0 END`)), 'open']
        ]
      }),
      Estimate.count({ include: [{ model: Referral, where: { tenantId } }] }),
      RewardSetting.count({ where: { tenantId } })
    ]);

    const totalReferrals = Number(referralCounts?.[0]?.get('total') || 0);
    const openReferrals = Number(referralCounts?.[0]?.get('open') || 0);

    const recommendations = [];

    // Highest priority: configure rewards if none exist yet
    if (rewardCount === 0) {
      recommendations.push({
        id: 'configure-rewards',
        title: 'Configure your rewards',
        description: 'Set up at least one reward so clients have an incentive to refer.',
        actionLabel: 'Add Rewards',
        actionHref: '/admin/rewards'
      });
    }

    if (clientCount === 0) {
      recommendations.push({
        id: 'add-clients',
        title: 'Add your first clients',
        description: 'Import or add clients so you can send referral invitations.',
        actionLabel: 'Go to Clients',
        actionHref: '/admin/clients'
      });
    }

    if (clientCount > 0 && totalReferrals === 0) {
      recommendations.push({
        id: 'send-invitations',
        title: 'Send invitations to generate referral links',
        description: 'Invite your clients to start sharing referral links.',
        actionLabel: 'Send Invitations',
        actionHref: '/admin/clients'
      });
    }

    if (openReferrals > 0) {
      recommendations.push({
        id: 'review-open-referrals',
        title: 'Review open referrals',
        description: 'You have open referrals awaiting action.',
        actionLabel: 'View Referrals',
        actionHref: '/admin/referrals'
      });
    }

    if (totalReferrals > 0 && estimateCount === 0) {
      recommendations.push({
        id: 'follow-up-estimates',
        title: 'Follow up to capture estimates',
        description: 'Convert referrals into estimates to track performance.',
        actionLabel: 'View Referrals',
        actionHref: '/admin/referrals'
      });
    }

    // Always add a settings nudge
    recommendations.push({
      id: 'customize-settings',
      title: 'Customize tenant settings',
      description: 'Update your branding, logo, and email settings.',
      actionLabel: 'Tenant Settings',
      actionHref: '/admin/tenants/settings'
    });

    res.json({ recommendations });
  } catch (err) {
    console.error('Recommendations error:', err);
    res.status(500).json({ message: 'Failed to load recommendations', error: err.message });
  }
};

