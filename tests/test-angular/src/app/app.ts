import { Component, signal, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Language {
  code: string;
  name: string;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TranslateModule, CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  // protected readonly title = signal('test-angular');
  protected selectedLanguage = signal('en');

  protected readonly languages: Language[] = [
    { code: 'en', name: 'English' },
    { code: 'en-US', name: 'English (United States)' },
    { code: 'en-GB', name: 'English (United Kingdom)' },
    { code: 'en-CA', name: 'English (Canada)' },
    { code: 'en-AU', name: 'English (Australia)' },
    { code: 'en-IE', name: 'English (Ireland)' },
    { code: 'it', name: 'Italian' },
    { code: 'it-IT', name: 'Italian (Italy)' },
    { code: 'fr', name: 'French' },
    { code: 'fr-FR', name: 'French (France)' },
    { code: 'fr-CA', name: 'French (Canada)' },
    { code: 'de', name: 'German' },
    { code: 'de-DE', name: 'German (Germany)' },
    { code: 'es', name: 'Spanish' },
    { code: 'es-ES', name: 'Spanish (Spain)' },
    { code: 'es-MX', name: 'Spanish (Mexico)' },
    { code: 'es-AR', name: 'Spanish (Argentina)' },
    { code: 'es-419', name: 'Spanish (Latin America)' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'pt-PT', name: 'Portuguese (Portugal)' },
    { code: 'pt-BR', name: 'Portuguese (Brazil)' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ja-JP', name: 'Japanese (Japan)' },
    { code: 'ko', name: 'Korean' },
    { code: 'ko-KR', name: 'Korean (South Korea)' },
    { code: 'zh', name: 'Chinese' },
    { code: 'zh-CN', name: 'Chinese (Simplified)' },
    { code: 'zh-TW', name: 'Chinese (Traditional)' },
    { code: 'zh-HK', name: 'Chinese (Hong Kong)' },
    { code: 'ar', name: 'Arabic' },
    { code: 'ar-SA', name: 'Arabic (Saudi Arabia)' },
    { code: 'pl', name: 'Polish' },
    { code: 'pl-PL', name: 'Polish (Poland)' },
    { code: 'uk', name: 'Ukrainian' },
    { code: 'uk-UA', name: 'Ukrainian (Ukraine)' },
    { code: 'ru', name: 'Russian' },
    { code: 'ru-RU', name: 'Russian (Russia)' },
    { code: 'nl', name: 'Dutch' },
    { code: 'nl-NL', name: 'Dutch (Netherlands)' },
    { code: 'nl-BE', name: 'Dutch (Belgium)' },
    { code: 'sv', name: 'Swedish' },
    { code: 'sv-SE', name: 'Swedish (Sweden)' },
    { code: 'da', name: 'Danish' },
    { code: 'da-DK', name: 'Danish (Denmark)' },
    { code: 'nb', name: 'Norwegian Bokmål' },
    { code: 'nb-NO', name: 'Norwegian Bokmål (Norway)' },
    { code: 'fi', name: 'Finnish' },
    { code: 'fi-FI', name: 'Finnish (Finland)' },
    { code: 'cs', name: 'Czech' },
    { code: 'cs-CZ', name: 'Czech (Czech Republic)' },
    { code: 'sk', name: 'Slovak' },
    { code: 'sk-SK', name: 'Slovak (Slovakia)' },
    { code: 'hu', name: 'Hungarian' },
    { code: 'hu-HU', name: 'Hungarian (Hungary)' },
    { code: 'tr', name: 'Turkish' },
    { code: 'tr-TR', name: 'Turkish (Turkey)' },
    { code: 'el', name: 'Greek' },
    { code: 'el-GR', name: 'Greek (Greece)' },
    { code: 'bg', name: 'Bulgarian' },
    { code: 'bg-BG', name: 'Bulgarian (Bulgaria)' },
    { code: 'hr', name: 'Croatian' },
    { code: 'hr-HR', name: 'Croatian (Croatia)' },
    { code: 'he', name: 'Hebrew' },
    { code: 'he-IL', name: 'Hebrew (Israel)' },
    { code: 'th', name: 'Thai' },
    { code: 'th-TH', name: 'Thai (Thailand)' },
    { code: 'id', name: 'Indonesian' },
    { code: 'id-ID', name: 'Indonesian (Indonesia)' },
    { code: 'ms', name: 'Malay' },
    { code: 'ms-MY', name: 'Malay (Malaysia)' },
    { code: 'ca', name: 'Catalan' },
    { code: 'ca-ES', name: 'Catalan (Spain)' },
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
}
