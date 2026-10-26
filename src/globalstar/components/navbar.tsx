import { Link, useLocation } from 'wouter';
import { useLanguage } from '@/globalstar/contexts/language-context';
import { Trophy, BarChart3, Newspaper, Landmark, Info, Coins } from 'lucide-react';
import { Button } from '@workspace/gdna-ds/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/gdna-ds/components/ui/dropdown-menu';

export function Navbar() {
  const [location] = useLocation();
  const { t, language, setLanguage, isRTL } = useLanguage();

  const navItems = [
    { path: '/', label: t('home'), icon: Trophy },
    { path: '/ranking', label: t('ranking'), icon: BarChart3 },
    { path: '/news', label: t('news'), icon: Newspaper },
    { path: '/traditions', label: t('traditions'), icon: Landmark },
    { path: '/about', label: t('about'), icon: Info },
    { path: '/earnings', label: t('earnings'), icon: Coins },
  ];

  const languages = [
    { code: 'ar', label: 'العربية' },
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'Français' },
    { code: 'es', label: 'Español' },
    { code: 'de', label: 'Deutsch' },
  ];

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50" data-testid="navbar">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2" data-testid="logo-link">
            <Trophy className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold">GlobalStar</span>
          </Link>

          <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" data-testid="language-switcher">
                {languages.find((l) => l.code === language)?.label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isRTL ? 'start' : 'end'}>
              {languages.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => setLanguage(lang.code as 'en' | 'ar' | 'fr' | 'es' | 'de')}
                  data-testid={`language-${lang.code}`}
                >
                  {lang.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
