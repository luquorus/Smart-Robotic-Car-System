export function parseDateRange(from, to) {
  let fromDate = null;
  let toDate = null;

  if (from) {
    fromDate = new Date(from);
    if (isNaN(fromDate.getTime())) {
      throw new Error('Invalid from date');
    }
  }

  if (to) {
    toDate = new Date(to);
    if (isNaN(toDate.getTime())) {
      throw new Error('Invalid to date');
    }
  }

  return { fromDate, toDate };
}

