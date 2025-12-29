import { createContext, useContext, useState } from 'react';

const SearchContext = createContext();

export const SearchProvider = ({ children }) => {
  const [searchParams, setSearchParams] = useState(null);

  console.log(searchParams);
  
  const handleSearch = (params) => {
    setSearchParams(params);
  };

  return (
    <SearchContext.Provider value={{ searchParams, handleSearch }}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};