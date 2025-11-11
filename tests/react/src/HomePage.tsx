import { useTranslation } from 'react-i18next'
import { useEffect } from 'react'
import { Select } from '@/components/ui/select'
import { Globe } from 'lucide-react'

const languages = [
  { code: 'en', name: 'English' },
  { code: 'it', name: 'Italiano' },
  { code: 'es', name: 'Español' },
  { code: 'pt', name: 'Português' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
]

export function HomePage() {
  const { t, i18n } = useTranslation()

  // Update document title when language changes
  useEffect(() => {
    document.title = t('pageTitle')
  }, [i18n.language, t])

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(event.target.value)
  }

  const currentDate = new Date().toLocaleDateString(i18n.language, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header with Language Selector */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <span className="font-semibold text-lg">{t('articleTitle')}</span>
          </div>
          <div className="flex items-center gap-3">
            <label htmlFor="language-select" className="text-sm font-medium text-muted-foreground">
              {t('selectLanguage')}:
            </label>
            <Select
              id="language-select"
              value={i18n.language}
              onChange={handleLanguageChange}
              className="w-[180px]"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </header>

      {/* Main Article Content */}
      <main className="container mx-auto max-w-4xl px-4 py-16">
        <article className="prose prose-lg dark:prose-invert max-w-none">
          {/* Article Header */}
          <header className="mb-12 space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-foreground mb-4">
              {t('articleTitle')}
            </h1>
            <p className="text-2xl text-muted-foreground italic font-light">
              {t('articleSubtitle')}
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground pt-4 border-t">
              <span>{t('author')}</span>
              <span>•</span>
              <span>{t('date')} {currentDate}</span>
            </div>
          </header>

          {/* Introduction */}
          <section className="mb-12">
            <h2 className="text-3xl font-semibold mb-4 text-foreground">
              {t('introduction.title')}
            </h2>
            <p className="text-lg leading-8 text-foreground/90">
              {t('introduction.content')}
            </p>
          </section>

          {/* Section 1 */}
          <section className="mb-12">
            <h2 className="text-3xl font-semibold mb-4 text-foreground">
              {t('section1.title')}
            </h2>
            <p className="text-lg leading-8 text-foreground/90">
              {t('section1.content')}
            </p>
          </section>

          {/* Section 2 */}
          <section className="mb-12">
            <h2 className="text-3xl font-semibold mb-4 text-foreground">
              {t('section2.title')}
            </h2>
            <p className="text-lg leading-8 text-foreground/90">
              {t('section2.content')}
            </p>
          </section>

          {/* Section 3 */}
          <section className="mb-12">
            <h2 className="text-3xl font-semibold mb-4 text-foreground">
              {t('section3.title')}
            </h2>
            <p className="text-lg leading-8 text-foreground/90">
              {t('section3.content')}
            </p>
          </section>

          {/* Section 4 */}
          <section className="mb-12">
            <h2 className="text-3xl font-semibold mb-4 text-foreground">
              {t('section4.title')}
            </h2>
            <p className="text-lg leading-8 text-foreground/90">
              {t('section4.content')}
            </p>
          </section>

          {/* Conclusion */}
          <section className="mb-12 pt-8 border-t">
            <h2 className="text-3xl font-semibold mb-4 text-foreground">
              {t('conclusion.title')}
            </h2>
            <p className="text-lg leading-8 text-foreground/90 font-medium">
              {t('conclusion.content')}
            </p>
          </section>
        </article>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background mt-16">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} {t('articleTitle')}</p>
        </div>
      </footer>
    </div>
  )
}
