<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { availableLanguages } from './i18n.js'

const { t, locale } = useI18n()

// Language switcher
const setLanguage = (lang) => {
  locale.value = lang
}

// Get current language info
const getCurrentLanguageInfo = () => {
  return availableLanguages[locale.value] || availableLanguages['en']
}
</script>

<template>
  <div class="container">
    <div class="content-wrapper">
      <img alt="Vue logo" class="logo" src="./assets/logo.svg" width="60" height="60" />
      <h1 class="title">{{ t('welcome') }}</h1>
      <p class="subtitle">Test page for Lara CLI translations</p>
      
      <div class="language-selector">
        <label for="lang-select" class="selector-label">Select Language:</label>
        <select 
          id="lang-select"
          v-model="locale" 
          @change="setLanguage(locale)"
          class="language-select"
        >
          <option 
            v-for="(langInfo, langCode) in availableLanguages" 
            :key="langCode"
            :value="langCode"
          >
            {{ langInfo.flag }} {{ langInfo.name }}
          </option>
        </select>
        <div class="current-language">
          Current: {{ getCurrentLanguageInfo().flag }} {{ getCurrentLanguageInfo().name }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.container {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  padding: 2rem;
}

.content-wrapper {
  background: white;
  border-radius: 24px;
  padding: 4rem 3rem;
  max-width: 600px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  text-align: center;
  animation: fadeIn 0.5s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.logo {
  margin-bottom: 2rem;
  filter: drop-shadow(0 4px 12px rgba(102, 126, 234, 0.3));
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

.title {
  font-size: 3rem;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 1rem;
  line-height: 1.2;
}

.subtitle {
  font-size: 1.125rem;
  color: #64748b;
  margin-bottom: 3rem;
  font-weight: 500;
}

.language-selector {
  margin-top: 2rem;
}

.selector-label {
  display: block;
  font-size: 0.95rem;
  font-weight: 600;
  color: #475569;
  margin-bottom: 0.75rem;
  text-align: left;
}

.language-select {
  width: 100%;
  padding: 1rem 1.25rem;
  font-size: 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  background-color: white;
  color: #1e293b;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: inherit;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23667eea' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 1rem center;
  padding-right: 3rem;
}

.language-select:hover {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.language-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.2);
}

.language-select option {
  padding: 0.75rem;
  font-size: 1rem;
}

.current-language {
  margin-top: 1rem;
  padding: 0.75rem 1.25rem;
  background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
  border-radius: 12px;
  font-size: 0.95rem;
  color: #475569;
  font-weight: 600;
}

@media (max-width: 768px) {
  .container {
    padding: 1rem;
  }

  .content-wrapper {
    padding: 3rem 2rem;
  }

  .title {
    font-size: 2.25rem;
  }

  .subtitle {
    font-size: 1rem;
    margin-bottom: 2rem;
  }

  .logo {
    width: 50px;
    height: 50px;
  }
}

@media (max-width: 480px) {
  .title {
    font-size: 1.875rem;
  }

  .content-wrapper {
    padding: 2.5rem 1.5rem;
  }
}
</style>
