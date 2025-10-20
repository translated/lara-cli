import { Component, signal, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Language {
  code: string;
  name: string;
  flag: string;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TranslateModule, CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  protected selectedLanguage = signal('en');

  protected readonly languages: Language[] = [
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
    { code: 'ar-SA', name: 'العربية (السعودية)', flag: '🇸🇦' },
    { code: 'bg', name: 'Български', flag: '🇧🇬' },
    { code: 'bg-BG', name: 'Български (България)', flag: '🇧🇬' },
    { code: 'ca', name: 'Català', flag: '🏴󠁥󠁳󠁣󠁴󠁿' },
    { code: 'ca-ES', name: 'Català (Espanya)', flag: '🇪🇸' },
    { code: 'cs', name: 'Čeština', flag: '🇨🇿' },
    { code: 'cs-CZ', name: 'Čeština (Česko)', flag: '🇨🇿' },
    { code: 'da', name: 'Dansk', flag: '🇩🇰' },
    { code: 'da-DK', name: 'Dansk (Danmark)', flag: '🇩🇰' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'de-DE', name: 'Deutsch (Deutschland)', flag: '🇩🇪' },
    { code: 'el', name: 'Ελληνικά', flag: '🇬🇷' },
    { code: 'el-GR', name: 'Ελληνικά (Ελλάδα)', flag: '🇬🇷' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'en-AU', name: 'English (Australia)', flag: '🇦🇺' },
    { code: 'en-CA', name: 'English (Canada)', flag: '🇨🇦' },
    { code: 'en-GB', name: 'English (UK)', flag: '🇬🇧' },
    { code: 'en-IE', name: 'English (Ireland)', flag: '🇮🇪' },
    { code: 'en-US', name: 'English (US)', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'es-419', name: 'Español (Latinoamérica)', flag: '🌎' },
    { code: 'es-AR', name: 'Español (Argentina)', flag: '🇦🇷' },
    { code: 'es-ES', name: 'Español (España)', flag: '🇪🇸' },
    { code: 'es-MX', name: 'Español (México)', flag: '🇲🇽' },
    { code: 'fi', name: 'Suomi', flag: '🇫🇮' },
    { code: 'fi-FI', name: 'Suomi (Suomi)', flag: '🇫🇮' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'fr-CA', name: 'Français (Canada)', flag: '🇨🇦' },
    { code: 'fr-FR', name: 'Français (France)', flag: '🇫🇷' },
    { code: 'he', name: 'עברית', flag: '🇮🇱' },
    { code: 'he-IL', name: 'עברית (ישראל)', flag: '🇮🇱' },
    { code: 'hr', name: 'Hrvatski', flag: '🇭🇷' },
    { code: 'hr-HR', name: 'Hrvatski (Hrvatska)', flag: '🇭🇷' },
    { code: 'hu', name: 'Magyar', flag: '🇭🇺' },
    { code: 'hu-HU', name: 'Magyar (Magyarország)', flag: '🇭🇺' },
    { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
    { code: 'id-ID', name: 'Bahasa Indonesia (Indonesia)', flag: '🇮🇩' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'it-IT', name: 'Italiano (Italia)', flag: '🇮🇹' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'ja-JP', name: '日本語 (日本)', flag: '🇯🇵' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'ko-KR', name: '한국어 (대한민국)', flag: '🇰🇷' },
    { code: 'ms', name: 'Bahasa Melayu', flag: '🇲🇾' },
    { code: 'ms-MY', name: 'Bahasa Melayu (Malaysia)', flag: '🇲🇾' },
    { code: 'nb', name: 'Norsk bokmål', flag: '🇳🇴' },
    { code: 'nb-NO', name: 'Norsk bokmål (Norge)', flag: '🇳🇴' },
    { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
    { code: 'nl-BE', name: 'Nederlands (België)', flag: '🇧🇪' },
    { code: 'nl-NL', name: 'Nederlands (Nederland)', flag: '🇳🇱' },
    { code: 'pl', name: 'Polski', flag: '🇵🇱' },
    { code: 'pl-PL', name: 'Polski (Polska)', flag: '🇵🇱' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
    { code: 'pt-BR', name: 'Português (Brasil)', flag: '🇧🇷' },
    { code: 'pt-PT', name: 'Português (Portugal)', flag: '🇵🇹' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'ru-RU', name: 'Русский (Россия)', flag: '🇷🇺' },
    { code: 'sk', name: 'Slovenčina', flag: '🇸🇰' },
    { code: 'sk-SK', name: 'Slovenčina (Slovensko)', flag: '🇸🇰' },
    { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
    { code: 'sv-SE', name: 'Svenska (Sverige)', flag: '🇸🇪' },
    { code: 'th', name: 'ไทย', flag: '🇹🇭' },
    { code: 'th-TH', name: 'ไทย (ไทย)', flag: '🇹🇭' },
    { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
    { code: 'tr-TR', name: 'Türkçe (Türkiye)', flag: '🇹🇷' },
    { code: 'uk', name: 'Українська', flag: '🇺🇦' },
    { code: 'uk-UA', name: 'Українська (Україна)', flag: '🇺🇦' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'zh-CN', name: '中文 (简体)', flag: '🇨🇳' },
    { code: 'zh-HK', name: '中文 (香港)', flag: '🇭🇰' },
    { code: 'zh-TW', name: '中文 (繁體)', flag: '🇹🇼' },
  ];

  constructor(private translate: TranslateService) {}

  ngOnInit(): void {
    this.translate.setDefaultLang('en');
    this.translate.use('en');
  }

  onLanguageChange(languageCode: string): void {
    this.selectedLanguage.set(languageCode);
    this.translate.use(languageCode);
  }

  getCurrentLanguageInfo(): Language {
    return (
      this.languages.find((lang) => lang.code === this.selectedLanguage()) ||
      this.languages.find((lang) => lang.code === 'en')!
    );
  }
}
