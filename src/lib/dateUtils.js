export const dateUtils = {
  formatDate: (dateString) => {
    const options = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateString).toLocaleDateString("en-US", options);
  },

  isValidDate: (dateString) => {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  },

  getDateRange: (period) => {
    const now = new Date();
    const start = new Date();

    switch (period) {
      case "week":
        start.setDate(now.getDate() - 7);
        break;
      case "month":
        start.setMonth(now.getMonth() - 1);
        break;
      case "year":
        start.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return { start: null, end: null };
    }

    return { start, end: now };
  },
};
