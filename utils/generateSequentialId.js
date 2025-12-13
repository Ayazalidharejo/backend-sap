/**
 * Generate sequential IDs like CUST001, CUST002, INV001, QUO001, etc.
 * @param {String} prefix - Prefix like 'CUST', 'INV', 'QUO'
 * @param {mongoose.Model} model - Mongoose model
 * @param {String} fieldName - Field name that stores the ID (e.g., 'serialNumber', 'invoiceNo')
 * @returns {String} Sequential ID
 */
async function generateSequentialId(prefix, model, fieldName) {
  try {
    // Find the last document sorted by the ID field
    const lastDoc = await model.findOne().sort({ [fieldName]: -1 });
    
    if (!lastDoc || !lastDoc[fieldName]) {
      // No documents exist, return first ID
      return `${prefix}001`;
    }
    
    // Extract the number part (e.g., "001" from "CUST001")
    const lastValue = lastDoc[fieldName];
    const match = lastValue.match(new RegExp(`${prefix}(\\d+)`, 'i'));
    
    if (!match) {
      // Invalid format, start from 001
      return `${prefix}001`;
    }
    
    const lastNumber = parseInt(match[1], 10);
    const nextNumber = lastNumber + 1;
    
    // Pad with zeros (e.g., 1 -> "001", 25 -> "025")
    const paddedNumber = nextNumber.toString().padStart(3, '0');
    
    return `${prefix}${paddedNumber}`;
  } catch (error) {
    console.error('Error generating sequential ID:', error);
    // Fallback: return timestamp-based ID
    return `${prefix}${Date.now().toString().slice(-6)}`;
  }
}

module.exports = generateSequentialId;
