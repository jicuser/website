import React from 'react';
import DonationPages from './DonationsCore';
import AppealsDisclosure from '@/features/appeals/AppealsDisclosure';
// Existing campaign and account routes retain their established payment and approval flows.
export { BankDetails, CampaignCard, CampaignsPage, CampaignPage, MyFundraisingPage } from './DonationsCore';
export default function DonationsPage() {
  return <><div className="ops-page jic-giving-appeals"><AppealsDisclosure /></div><DonationPages /></>;
}
