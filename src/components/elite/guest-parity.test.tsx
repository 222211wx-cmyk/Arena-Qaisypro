import { afterEach,expect,it,vi } from 'vitest';
import { cleanup,fireEvent,render,screen } from '@testing-library/react';
import { GuestOfHonorCard } from './GuestOfHonorCard';
import { EliteCarousel } from './EliteCarousel';
import { getEliteProfile } from '@/lib/elite-profiles';
vi.mock('./ElitePortrait',()=>({ElitePortrait:({name}:{name:string})=><div>{name} portrait</div>}));
vi.mock('@workspace/gdna-ds/components/ui/carousel',()=>({Carousel:({children}:any)=><div>{children}</div>,CarouselContent:({children}:any)=><div>{children}</div>,CarouselItem:({children}:any)=><div>{children}</div>,CarouselPrevious:()=>null,CarouselNext:()=>null}));
vi.stubGlobal('IntersectionObserver',class {observe(){}unobserve(){}disconnect(){} });
afterEach(cleanup);
it('reuses the existing editorial gold card and routes to its dedicated VIP URL',()=>{
 render(<GuestOfHonorCard profile={getEliteProfile('adele')!} testId="adele"/>);
 expect(screen.getByTestId('adele').getAttribute('href')).toBe('/vip/adele');
 expect(screen.getByText('👑 GUEST OF HONOR - 10 STAR')).toBeTruthy();expect(screen.getByText('10/10')).toBeTruthy();
});
it('shows Adele in the centered spotlight first and dismisses it locally in one click',()=>{
 render(<EliteCarousel/>);const card=screen.getByTestId('card-elite-adele');expect(card.closest('.guest-spotlight')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Masquer Adele / إخفاء Adele'}));expect(screen.queryByTestId('card-elite-adele')).toBeNull();
});
