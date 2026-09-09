import React from 'react';
    import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
    import ReligiousServicesTab from '@/components/sections/services/ReligiousServicesTab';
    import EducationalProgramsTab from '@/components/sections/services/EducationalProgramsTab';
    import CommunityServicesTab from '@/components/sections/services/CommunityServicesTab';

    const ServiceCategoriesTabs = () => {
      return (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <Tabs defaultValue="religious" className="w-full">
              <div className="flex justify-center mb-8">
                <TabsList className="grid grid-cols-1 md:grid-cols-3 w-full max-w-2xl">
                  <TabsTrigger value="religious" className="text-sm md:text-base">Religious Services</TabsTrigger>
                  <TabsTrigger value="educational" className="text-sm md:text-base">Educational Programs</TabsTrigger>
                  <TabsTrigger value="community" className="text-sm md:text-base">Community Services</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="religious" className="space-y-8">
                <ReligiousServicesTab />
              </TabsContent>

              <TabsContent value="educational" className="space-y-8">
                <EducationalProgramsTab />
              </TabsContent>

              <TabsContent value="community" className="space-y-8">
                <CommunityServicesTab />
              </TabsContent>
            </Tabs>
          </div>
        </section>
      );
    };

    export default ServiceCategoriesTabs;