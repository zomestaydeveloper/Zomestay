import React from 'react';

const Loader = ({ 
  variant = 'default', 
  size = 'medium', 
  text = 'Loading...', 
  showText = true,
  className = '',
  fullScreen = false 
}) => {
  // Size variants
  const sizeClasses = {
    small: 'h-8 w-8',
    medium: 'h-12 w-12', 
    large: 'h-16 w-16',
    xlarge: 'h-24 w-24'
  };

  // Text size variants
  const textSizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg',
    xlarge: 'text-xl'
  };

  // Variant styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'spinner':
        return {
          container: 'flex items-center justify-center',
          spinner: `rounded-full border-4 border-gray-200 border-t-blue-600 animate-spin ${sizeClasses[size]}`,
          text: `${textSizeClasses[size]} text-gray-600 mt-2`
        };
      case 'dots':
        return {
          container: 'flex items-center justify-center space-x-1',
          spinner: 'flex space-x-1',
          text: `${textSizeClasses[size]} text-gray-600 mt-2`
        };
      case 'pulse':
        return {
          container: 'flex items-center justify-center',
          spinner: `bg-blue-600 rounded-full animate-pulse ${sizeClasses[size]}`,
          text: `${textSizeClasses[size]} text-gray-600 mt-2`
        };
      case 'skeleton':
        return {
          container: 'animate-pulse',
          spinner: 'bg-gray-200 rounded',
          text: `${textSizeClasses[size]} text-gray-600 mt-2`
        };
      default:
        return {
          container: 'flex items-center justify-center',
          spinner: `rounded-full border-4 border-gray-200 border-t-blue-600 animate-spin ${sizeClasses[size]}`,
          text: `${textSizeClasses[size]} text-gray-600 mt-2`
        };
    }
  };

  const styles = getVariantStyles();

  // Dots animation component
  const DotsLoader = () => (
    <div className="flex space-x-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`bg-blue-600 rounded-full animate-bounce ${sizeClasses[size].replace('h-', 'h-').replace('w-', 'w-')}`}
          style={{
            animationDelay: `${i * 0.1}s`,
            animationDuration: '0.6s'
          }}
        />
      ))}
    </div>
  );

  // Skeleton loader component
  const SkeletonLoader = () => (
    <div className="space-y-3">
      <div className={`bg-gray-200 rounded ${sizeClasses[size]}`}></div>
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </div>
  );

  // Render different variants
  const renderLoader = () => {
    switch (variant) {
      case 'dots':
        return <DotsLoader />;
      case 'skeleton':
        return <SkeletonLoader />;
      case 'pulse':
        return <div className={styles.spinner}></div>;
      default:
        return <div className={styles.spinner}></div>;
    }
  };

  const containerClasses = fullScreen 
    ? 'fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center'
    : `w-full h-[400px] ${styles.container}`;

  return (
    <div className={`${containerClasses} ${className}`}>
      <div className="flex flex-col items-center">
        {renderLoader()}
        {showText && text && (
          <p className={styles.text}>{text}</p>
        )}
      </div>
    </div>
  );
};

// Specialized loaders for different use cases
export const PageLoader = ({ text = 'Loading page...' }) => (
  <Loader 
    variant="spinner" 
    size="large" 
    text={text} 
    fullScreen={true}
  />
);

export const CardLoader = ({ text = 'Loading properties...' }) => (
  <Loader 
    variant="spinner" 
    size="medium" 
    text={text}
    className="h-[300px]"
  />
);

export const WidgetLoader = ({ text = 'Loading pricing...' }) => (
  <Loader 
    variant="pulse" 
    size="small" 
    text={text}
    className="h-[200px]"
  />
);

export const SkeletonCard = () => (
  <div className="animate-pulse bg-white rounded-lg shadow-lg p-6">
    <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
  </div>
);

export const SkeletonList = ({ count = 3 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="animate-pulse flex space-x-4 p-4">
        <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    ))}
  </div>
);

export default Loader;