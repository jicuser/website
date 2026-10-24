import React from 'react';
import { Utensils, Users } from 'lucide-react';
import { money } from '@/features/operations/model';

export default function MealSummary({ offer, fallbackPrice = 0 }) {
  const configured = Number(offer?.offer_version) > 0;
  const costed =
    offer?.dishes?.length && offer.dishes.every((dish) => Number.isInteger(dish.cost_pence));
  const adjustment =
    costed && Number.isInteger(offer.price_pence)
      ? offer.price_pence - offer.dishes.reduce((total, dish) => total + dish.cost_pence, 0)
      : 0;
  return (
    <div className="meal-summary">
      <h3>
        <Utensils size={18} aria-hidden="true" />
        {offer?.menu_title || 'Meal menu'}
      </h3>
      {offer?.dishes?.length > 0 ? (
        <ul className="meal-dishes">
          {offer.dishes.map((dish, index) => (
            <li key={index}>
              <span>{dish.name}</span>
              <span>{dish.cost_pence != null ? money(dish.cost_pence) : 'Included'}</span>
            </li>
          ))}
          {adjustment !== 0 && (
            <li>
              <span>Meal adjustment</span>
              <span>{money(adjustment)}</span>
            </li>
          )}
        </ul>
      ) : (
        <p>Menu details will be confirmed by the team.</p>
      )}
      <div className="meal-totals">
        <span>
          <small>{configured ? 'Total sponsorship' : 'Suggested sponsorship'}</small>
          <strong>
            {offer?.price_pence
              ? money(offer.price_pence)
              : fallbackPrice
                ? money(fallbackPrice)
                : 'Confirm with the team'}
          </strong>
        </span>
        {offer?.people_fed > 0 && (
          <span>
            <Users size={18} aria-hidden="true" />
            Feeds {offer.people_fed} people
          </span>
        )}
      </div>
      {offer?.menu_notes && <p className="meal-notes">{offer.menu_notes}</p>}
    </div>
  );
}
