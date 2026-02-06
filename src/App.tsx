import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainMenu } from './pages/MainMenu';
import { GameSetup } from './pages/GameSetup';
import { GameScreen } from './pages/GameScreen';
import { RulesPage } from './pages/RulesPage';
import DevCombatSim from './pages/DevCombatSim';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/setup" element={<GameSetup />} />
        <Route path="/game" element={<GameScreen />} />
        <Route path="/rules" element={<RulesPage />} />
        <Route path="/dev/combat" element={<DevCombatSim />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
