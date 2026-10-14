import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { programmeJourney } from '@/lib/programmeJourney';

const ProgrammeJourneyContext = createContext(null);
const RegisterProgrammeJourneyContext = createContext(() => {});

// Dynamic pages supply verified metadata after loading. Matching the complete
// route prevents a previous programme appearing while the next page loads.
export function ProgrammeJourneyProvider({ children }) {
  const { pathname, search } = useLocation();
  const [registered, setRegistered] = useState(null);
  const route = pathname + search;
  const current = registered?.route === route ? registered.programme : null;
  return (
    <RegisterProgrammeJourneyContext.Provider value={setRegistered}>
      <ProgrammeJourneyContext.Provider value={current}>
        {children}
      </ProgrammeJourneyContext.Provider>
    </RegisterProgrammeJourneyContext.Provider>
  );
}

export const useProgrammeJourney = () => useContext(ProgrammeJourneyContext);

export function useRegisterProgrammeJourney(page) {
  const { pathname, search } = useLocation();
  const setRegistered = useContext(RegisterProgrammeJourneyContext);
  const programme = useMemo(() => programmeJourney(page), [page]);
  const route = pathname + search;
  useEffect(() => {
    setRegistered({ route, programme });
    return () => {
      setRegistered((current) =>
        current?.route === route && current.programme === programme ? null : current,
      );
    };
  }, [programme, route, setRegistered]);
}
