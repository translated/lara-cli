<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { availableLanguages } from './i18n.js'

const { t, locale } = useI18n()
const currentTime = ref(new Date().toLocaleString())
const showLanguageDropdown = ref(false)

// Update time every second
setInterval(() => {
  currentTime.value = new Date().toLocaleString()
}, 1000)

// Language switcher
const setLanguage = (lang) => {
  locale.value = lang
  showLanguageDropdown.value = false
}

const toggleLanguageDropdown = () => {
  showLanguageDropdown.value = !showLanguageDropdown.value
}

// Get current language info
const getCurrentLanguageInfo = () => {
  return availableLanguages[locale.value] || availableLanguages['en']
}
</script>

<template>
  <div class="container">
    <header class="header">
      <img alt="Vue logo" class="logo" src="./assets/logo.svg" width="80" height="80" />
      <h1 class="title">{{ t('welcome') }}</h1>
      
      <!-- Language Selector -->
      <div class="language-selector">
        <button class="lang-btn" @click="toggleLanguageDropdown">
          {{ getCurrentLanguageInfo().flag }} {{ getCurrentLanguageInfo().name }}
          <span class="dropdown-arrow">{{ showLanguageDropdown ? '▲' : '▼' }}</span>
        </button>
        
        <div v-if="showLanguageDropdown" class="language-dropdown">
          <div class="dropdown-header">{{ t('language_selector') }}</div>
          <div class="language-list">
            <button 
              v-for="(langInfo, langCode) in availableLanguages" 
              :key="langCode"
              class="language-option"
              :class="{ active: locale === langCode }"
              @click="setLanguage(langCode)"
            >
              <span class="flag">{{ langInfo.flag }}</span>
              <span class="name">{{ langInfo.name }}</span>
              <span v-if="locale === langCode" class="checkmark">✓</span>
            </button>
          </div>
        </div>
      </div>
    </header>

    <main class="main-content">
      <div class="welcome-card">
        <h2>{{ t('simple_page') }}</h2>
        <p class="description">
          {{ t('description') }} 
          <code>http://localhost:5176/</code>
        </p>
        
        <div class="info-section">
          <div class="info-item">
            <strong>{{ t('framework') }}:</strong> Vue 3
          </div>
          <div class="info-item">
            <strong>{{ t('build_tool') }}:</strong> Vite
          </div>
          <div class="info-item">
            <strong>{{ t('current_time') }}:</strong> {{ currentTime }}
          </div>
        </div>

        <div class="features">
          <h3>{{ t('features') }}:</h3>
          <ul>
            <li>{{ t('responsive_design') }}</li>
            <li>{{ t('real_time_clock') }}</li>
            <li>{{ t('modern_styles') }}</li>
            <li>{{ t('i18n_support') }}</li>
          </ul>
        </div>

        <div class="actions">
          <button class="btn primary" @click="alert(locale === 'it' ? 'Ciao da Vue!' : 'Hello from Vue!')">
            {{ t('click_here') }}
          </button>
        </div>
      </div>
    </main>

    <footer class="footer">
      <p>{{ t('footer_text') }}</p>
    </footer>
  </div>
</template>

<style scoped>
.container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.header {
  text-align: center;
  padding: 2rem;
  color: white;
  position: relative;
}

.language-selector {
  position: absolute;
  top: 1rem;
  right: 1rem;
}

.lang-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 0.75rem 1.25rem;
  border-radius: 25px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 180px;
  justify-content: space-between;
}

.lang-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.dropdown-arrow {
  font-size: 0.8rem;
  transition: transform 0.3s ease;
}

.language-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.5rem;
  background: white;
  border-radius: 15px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  min-width: 280px;
  max-height: 400px;
  overflow: hidden;
  z-index: 1000;
  backdrop-filter: blur(10px);
}

.dropdown-header {
  padding: 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: bold;
  text-align: center;
  font-size: 0.9rem;
}

.language-list {
  max-height: 320px;
  overflow-y: auto;
}

.language-option {
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  background: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition: all 0.2s ease;
  color: #333;
  font-size: 0.9rem;
}

.language-option:hover {
  background: #f8f9fa;
}

.language-option.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.language-option .flag {
  font-size: 1.2rem;
  min-width: 24px;
}

.language-option .name {
  flex: 1;
  text-align: left;
}

.language-option .checkmark {
  font-weight: bold;
  color: #4CAF50;
}

.language-option.active .checkmark {
  color: white;
}

/* Scrollbar styling for language list */
.language-list::-webkit-scrollbar {
  width: 6px;
}

.language-list::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.language-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.language-list::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.logo {
  margin-bottom: 1rem;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
}

.title {
  font-size: 2.5rem;
  margin: 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.main-content {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
}

.welcome-card {
  background: white;
  border-radius: 20px;
  padding: 3rem;
  max-width: 600px;
  width: 100%;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.welcome-card h2 {
  color: #333;
  margin-bottom: 1rem;
  font-size: 2rem;
}

.description {
  color: #666;
  font-size: 1.1rem;
  line-height: 1.6;
  margin-bottom: 2rem;
}

.description code {
  background: #f0f0f0;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  color: #e91e63;
}

.info-section {
  background: #f8f9fa;
  border-radius: 10px;
  padding: 1.5rem;
  margin: 2rem 0;
}

.info-item {
  margin: 0.5rem 0;
  font-size: 1rem;
}

.info-item strong {
  color: #333;
}

.features {
  text-align: left;
  margin: 2rem 0;
}

.features h3 {
  color: #333;
  margin-bottom: 1rem;
  text-align: center;
}

.features ul {
  list-style: none;
  padding: 0;
}

.features li {
  padding: 0.5rem 0;
  font-size: 1rem;
  color: #555;
}

.actions {
  margin-top: 2rem;
}

.btn {
  padding: 1rem 2rem;
  border: none;
  border-radius: 50px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn.primary {
  background: linear-gradient(45deg, #667eea, #764ba2);
  color: white;
}

.btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
}

.footer {
  text-align: center;
  padding: 1rem;
  color: white;
  background: rgba(0, 0, 0, 0.1);
}

@media (max-width: 768px) {
  .title {
    font-size: 2rem;
  }
  
  .welcome-card {
    padding: 2rem;
    margin: 1rem;
  }
  
  .welcome-card h2 {
    font-size: 1.5rem;
  }
  
  .language-selector {
    position: static;
    margin-top: 1rem;
    display: flex;
    justify-content: center;
  }
  
  .lang-btn {
    min-width: 160px;
  }
  
  .language-dropdown {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    right: auto;
    margin-top: 0;
    max-width: 90vw;
    max-height: 80vh;
  }
}
</style>
