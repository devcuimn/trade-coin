function buildAppKey() {
  const plus30DaysMs = 700 * 24 * 60 * 60 * 1000;
  const futureTs = Date.now() + plus30DaysMs; // giờ hôm nay + 30 ngày
  const time36 = futureTs.toString(36);
  return 'devcui-' + time36;
}

if (require.main === module) {
  console.log(buildAppKey());
}

module.exports = { buildAppKey };


