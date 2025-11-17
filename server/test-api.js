const fetch = require('node-fetch');

async function testAPI() {
  try {
    console.log('Testing API...');
    
    const response = await fetch('http://localhost:5000/api/rooms?propertyId=ebf9aafc-03d3-438a-848e-140ecca1223e');
    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response data:', data);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testAPI();
