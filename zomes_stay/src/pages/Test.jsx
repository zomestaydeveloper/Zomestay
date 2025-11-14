import { useEffect } from 'react';
import { propertyService } from '../services';

const Test = () => {
  useEffect(() => {
    const testApi = async () => {
      try {
        // Example: Login
        // const loginResponse = await authService.login('test@example.com', 'password');
        
        // Example: Get properties
        const properties = await propertyService.getProperties();
        console.log('Properties:', properties);
      } catch (error) {
        console.error('Error:', error);
      }
    };
    
    testApi();
  }, []);

  return <div>Check console for API response</div>;
};

export default Test;