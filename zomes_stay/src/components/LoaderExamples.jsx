import React, { useState } from 'react';
import Loader, { 
  PageLoader, 
  CardLoader, 
  WidgetLoader, 
  SkeletonCard, 
  SkeletonList 
} from './Loader';

const LoaderExamples = () => {
  const [showLoaders, setShowLoaders] = useState(false);

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold text-center mb-8">Loader Component Examples</h1>
      
      <div className="text-center mb-8">
        <button
          onClick={() => setShowLoaders(!showLoaders)}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showLoaders ? 'Hide' : 'Show'} All Loaders
        </button>
      </div>

      {showLoaders && (
        <div className="space-y-12">
          {/* Basic Loader Variants */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Basic Loader Variants</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">Default Spinner</h3>
                <Loader variant="spinner" text="Loading..." />
              </div>
              
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">Dots Animation</h3>
                <Loader variant="dots" text="Processing..." />
              </div>
              
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">Pulse Animation</h3>
                <Loader variant="pulse" text="Syncing..." />
              </div>
              
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">Skeleton</h3>
                <Loader variant="skeleton" text="Building..." />
              </div>
            </div>
          </section>

          {/* Size Variants */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Size Variants</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">Small</h3>
                <Loader size="small" text="Small loader" />
              </div>
              
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">Medium</h3>
                <Loader size="medium" text="Medium loader" />
              </div>
              
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">Large</h3>
                <Loader size="large" text="Large loader" />
              </div>
              
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">Extra Large</h3>
                <Loader size="xlarge" text="Extra large loader" />
              </div>
            </div>
          </section>

          {/* Specialized Loaders */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Specialized Loaders</h2>
            <div className="space-y-6">
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">Page Loader (Full Screen)</h3>
                <div className="relative h-32 border-2 border-dashed border-gray-300 rounded-lg">
                  <PageLoader text="Loading page..." />
                </div>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">Card Loader</h3>
                <CardLoader text="Loading properties..." />
              </div>
              
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">Widget Loader</h3>
                <WidgetLoader text="Loading pricing..." />
              </div>
            </div>
          </section>

          {/* Skeleton Loaders */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Skeleton Loaders</h2>
            <div className="space-y-6">
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">Skeleton Card</h3>
                <SkeletonCard />
              </div>
              
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">Skeleton List</h3>
                <SkeletonList count={4} />
              </div>
            </div>
          </section>

          {/* Customization Examples */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Customization Examples</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">Custom Colors</h3>
                <Loader 
                  variant="spinner" 
                  text="Custom loader" 
                  className="text-green-600"
                />
              </div>
              
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">No Text</h3>
                <Loader 
                  variant="dots" 
                  showText={false}
                />
              </div>
              
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">Custom Height</h3>
                <Loader 
                  variant="pulse" 
                  text="Custom height" 
                  className="h-24"
                />
              </div>
              
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">Custom Text</h3>
                <Loader 
                  variant="spinner" 
                  text="This is a custom loading message with more details..."
                />
              </div>
            </div>
          </section>

          {/* Usage Examples */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Usage Examples</h2>
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="font-medium mb-4">Code Examples:</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <code className="bg-gray-200 px-2 py-1 rounded">
                    {`<PageLoader text="Loading page..." />`}
                  </code>
                  <p className="text-gray-600 mt-1">Full screen loader for page transitions</p>
                </div>
                
                <div>
                  <code className="bg-gray-200 px-2 py-1 rounded">
                    {`<CardLoader text="Loading properties..." />`}
                  </code>
                  <p className="text-gray-600 mt-1">Loader for card grids and lists</p>
                </div>
                
                <div>
                  <code className="bg-gray-200 px-2 py-1 rounded">
                    {`<WidgetLoader text="Loading pricing..." />`}
                  </code>
                  <p className="text-gray-600 mt-1">Small loader for widgets and components</p>
                </div>
                
                <div>
                  <code className="bg-gray-200 px-2 py-1 rounded">
                    {`<SkeletonCard />`}
                  </code>
                  <p className="text-gray-600 mt-1">Skeleton placeholder for cards</p>
                </div>
                
                <div>
                  <code className="bg-gray-200 px-2 py-1 rounded">
                    {`<Loader variant="dots" size="large" text="Processing..." />`}
                  </code>
                  <p className="text-gray-600 mt-1">Custom loader with dots animation</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default LoaderExamples;
