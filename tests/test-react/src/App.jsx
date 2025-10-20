import { useState } from 'react'
import reactLogo from './assets/react.svg'
import './App.css'
import { useTranslation } from 'react-i18next';
import i18n, { availableLanguages } from './translations/i18n.tsx';

function App() {
  const { t } = useTranslation();
  const [currentLang, setCurrentLang] = useState(i18n.language || 'en');

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    i18n.changeLanguage(newLang);
    setCurrentLang(newLang);
  };

  const getCurrentLanguageInfo = () => {
    return availableLanguages[currentLang] || availableLanguages['en'];
  };

  return (
    <div className="app-container">
      <div className="content-wrapper">
        <img src={reactLogo} className="logo" alt="React logo" width="60" height="60" />
        <h1 className="title">{t('welcome')}</h1>
        <p className="subtitle">Test page for Lara CLI translations</p>
        
        <div className="language-selector">
          <label htmlFor="lang-select" className="selector-label">Select Language:</label>
          <select 
            id="lang-select"
            value={currentLang}
            onChange={handleLanguageChange}
            className="language-select"
          >
            {Object.entries(availableLanguages).map(([code, info]) => (
              <option key={code} value={code}>
                {info.flag} {info.name}
              </option>
            ))}
          </select>
          <div className="current-language">
            Current: {getCurrentLanguageInfo().flag} {getCurrentLanguageInfo().name}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
