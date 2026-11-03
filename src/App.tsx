import React from 'react';
import { AuctionProvider, useAuction } from './context/AuctionContext';
import { LobbyScreen } from './components/LobbyScreen';
import { AuctionScreen } from './components/AuctionScreen';
import { ToastContainer } from './components/ToastContainer';

const MainRouter: React.FC = () => {
  const { screen } = useAuction();

  return (
    <>
      <ToastContainer />
      {screen === 'lobby' ? <LobbyScreen /> : <AuctionScreen />}
    </>
  );
};

export const App: React.FC = () => {
  return (
    <AuctionProvider>
      <MainRouter />
    </AuctionProvider>
  );
};

export default App;
