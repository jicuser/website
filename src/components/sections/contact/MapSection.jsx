import React from 'react';
    import { MapPin } from 'lucide-react';

    const MapSection = () => (
      <>
        <div className="flex items-center mb-6">
          <MapPin className="h-6 w-6 text-primary mr-2" />
          <h2 className="text-2xl font-bold">Find Us</h2>
        </div>
        
        <div className="h-[400px] rounded-lg overflow-hidden">
          <iframe 
            src="https://www.openstreetmap.org/export/embed.html?layer=mapnik&amp;bbox=-1.861466%2C52.442115%2C-1.859466%2C52.444115&amp;marker=52.443115%2C-1.860466"
            width="100%" 
            height="100%" 
            frameBorder="0" 
            style={{ border: 0 }} 
            allowFullScreen="" 
            aria-hidden="false" 
            tabIndex="0"
            title="Jamatia Islamic Centre Location - Map centered at 52.443115, -1.860466"
          ></iframe>
        </div>
        
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="font-bold mb-2">Getting Here:</h3>
          <ul className="space-y-2 text-gray-600 dark:text-gray-300 text-sm">
            <li className="flex items-start">
              <span className="text-primary mr-2">•</span>
              <span><strong>Address:</strong> 179-183 Woodlands Rd, Birmingham B11 4ER (Main Centre). Please verify specific event locations if different.</span>
            </li>
            <li className="flex items-start">
              <span className="text-primary mr-2">•</span>
              <span><strong>Bus Routes:</strong> Check local bus routes serving the area.</span>
            </li>
            <li className="flex items-start">
              <span className="text-primary mr-2">•</span>
              <span><strong>Parking:</strong> Limited street parking available. Please observe local parking restrictions.</span>
            </li>
          </ul>
        </div>
      </>
    );

    export default MapSection;