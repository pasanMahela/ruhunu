const mongoose = require('mongoose');
const Customer = require('./models/Customer');

// Test NIC validation
const testNic = (nic) => {
  const nicRegex = /^([0-9]{9}[vVxX]|[0-9]{12})$/;
  const isValid = nicRegex.test(nic);
  
  console.log('Testing NIC:', nic);
  console.log('Length:', nic.length);
  console.log('Is valid:', isValid);
  console.log('Regex pattern:', nicRegex.toString());
  console.log('---');
  
  return isValid;
};

// Test the NIC from your example
console.log('Testing NIC validation...\n');

const testNics = [
  '200028100322',  // Your example
  '123456789V',    // Old format
  '123456789X',    // Old format
  '123456789012',  // New format
  '123456789',     // Invalid (too short)
  '1234567890123', // Invalid (too long)
  '123456789A',    // Invalid (wrong letter)
  ''               // Empty
];

testNics.forEach(testNic);

console.log('\nTesting Customer model validation...');

// Test with mongoose validation
const testCustomerValidation = async () => {
  try {
    // Connect to MongoDB (you'll need to update this URL)
    await mongoose.connect('mongodb://localhost:27017/your-database-name', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB');
    
    // Test creating a customer with the NIC from your example
    const testCustomer = new Customer({
      nic: '200028100322',
      name: 'Test Customer',
      createdBy: new mongoose.Types.ObjectId() // You'll need a valid user ID
    });
    
    await testCustomer.save();
    console.log('Customer created successfully:', testCustomer._id);
    
    // Clean up
    await Customer.findByIdAndDelete(testCustomer._id);
    console.log('Test customer cleaned up');
    
  } catch (error) {
    console.error('Validation error:', error.message);
    if (error.errors) {
      Object.keys(error.errors).forEach(key => {
        console.error(`${key}:`, error.errors[key].message);
      });
    }
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Uncomment the line below to test with actual database
// testCustomerValidation(); 