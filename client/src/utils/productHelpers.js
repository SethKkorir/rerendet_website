/**
 * Checks if a product is "Freshly Roasted" (within last 7 days)
 * @param {Date|String} roastDate 
 * @returns {Boolean}
 */
export const isFreshlyRoasted = (roastDate) => {
    if (!roastDate) return false;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const roast = new Date(roastDate);
    return roast >= sevenDaysAgo && roast <= new Date();
};
