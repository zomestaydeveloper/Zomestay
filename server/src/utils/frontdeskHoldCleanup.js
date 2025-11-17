const createDateFormatter = () =>
  new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

const isUuidLike = (value) =>
  typeof value === 'string' &&
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    value.trim()
  );

const cleanupExpiredFrontDeskHolds = async (prisma) => {
  const now = new Date();
  const formatter = createDateFormatter();

  const expiredRecords = await prisma.availability.findMany({
    where: {
      status: 'blocked',
      isDeleted: false,
      holdExpiresAt: {
        not: null,
        lte: now,
      },
    },
    select: {
      id: true,
      blockedBy: true,
    },
  });

  if (expiredRecords.length === 0) {
    console.log(
      `ℹ️ Front desk hold cleanup ran at ${formatter.format(now)} IST (no expired holds)`
    );
    return;
  }

  const potentialOrderIds = Array.from(
    new Set(
      expiredRecords
        .map((record) => record.blockedBy)
        .filter((value) => isUuidLike(value))
    )
  );

  let activeOrders = [];
  if (potentialOrderIds.length > 0) {
    activeOrders = await prisma.order.findMany({
      where: {
        id: { in: potentialOrderIds },
        status: 'PENDING',
        isDeleted: false,
        expiresAt: {
          gt: now,
        },
      },
      select: {
        id: true,
      },
    });
  }

  const activeOrderIdSet = new Set(activeOrders.map((order) => order.id));
  const availabilityIdsToRelease = expiredRecords
    .filter((record) => !record.blockedBy || !activeOrderIdSet.has(record.blockedBy))
    .map((record) => record.id);

  if (availabilityIdsToRelease.length === 0) {
    console.log(
      `ℹ️ Front desk hold cleanup ran at ${formatter.format(
        now
      )} IST (all expired holds still tied to active orders)`
    );
    return;
  }

  const result = await prisma.availability.deleteMany({
    where: {
      id: { in: availabilityIdsToRelease },
    },
  });

  console.log(
    `🔄 Released ${result.count} expired front desk hold(s) at ${formatter.format(now)} IST`
  );
};

const createFrontDeskHoldCleanup = (prisma) => {
  let timer = null;

  const runCleanup = async () => {
    try {
      await cleanupExpiredFrontDeskHolds(prisma);
    } catch (error) {
      console.error('❌ Failed to cleanup expired front desk holds:', error);
    }
  };

  const start = async (intervalMs) => {
    await runCleanup();
    timer = setInterval(() => {
      runCleanup();
    }, intervalMs);
    return timer;
  };

  const stop = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  return { start, stop, runCleanup };
};

module.exports = {
  createFrontDeskHoldCleanup,
  cleanupExpiredFrontDeskHolds,
};

