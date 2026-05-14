/**
 * Generate sequential IDs like CUST001, CUST002, INV001, QUO001, etc.
 * @param {String} prefix - Prefix like 'CUST', 'INV', 'QUO'
 * @param {mongoose.Model} model - Mongoose model
 * @param {String} fieldName - Field name that stores the ID (e.g., 'serialNumber', 'invoiceNo')
 * @returns {String} Sequential ID
 */
async function generateSequentialId(prefix, model, fieldName) {
  try {
    // Do not use lexicographic sort (e.g. DC010 < DC009 as strings) — take max numeric suffix.
    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const suffixRe = new RegExp(`^${escapedPrefix}(\\d+)$`, 'i');
    const docs = await model
      .find({ [fieldName]: new RegExp(`^${escapedPrefix}\\d+$`, 'i') })
      .select(fieldName)
      .lean();

    let maxNumber = 0;
    for (const doc of docs) {
      const val = doc[fieldName];
      if (val == null) continue;
      const m = String(val).match(suffixRe);
      if (m) {
        const n = parseInt(m[1], 10);
        if (!Number.isNaN(n) && n > maxNumber) maxNumber = n;
      }
    }

    if (maxNumber === 0) {
      return `${prefix}001`;
    }

    const nextNumber = maxNumber + 1;
    const paddedNumber = nextNumber.toString().padStart(3, '0');
    return `${prefix}${paddedNumber}`;
  } catch (error) {
    console.error('Error generating sequential ID:', error);
    // Fallback: return timestamp-based ID
    return `${prefix}${Date.now().toString().slice(-6)}`;
  }
}

module.exports = generateSequentialId;
