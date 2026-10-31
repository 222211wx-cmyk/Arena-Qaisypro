import {afterEach,expect,it,vi} from 'vitest';
import {render,screen,cleanup} from '@testing-library/react';
import {GuestWelcome} from './GuestWelcome';
vi.mock('@/contexts/LangContext',()=>({useLang:()=>({lang:'en'})}));
afterEach(cleanup);
it('shows immediate public value without authentication or a login form',()=>{
 render(<GuestWelcome/>);
 expect(screen.getByRole('heading',{name:'Explore ARENA — no account needed'})).toBeTruthy();
 expect(screen.getByRole('link',{name:'Watch clips'}).getAttribute('href')).toBe('/clips');
 expect(screen.getByRole('link',{name:'Latest news'}).getAttribute('href')).toBe('/news');
 expect(screen.getByRole('link',{name:'Explore sections'}).getAttribute('href')).toBe('/hub');
 expect(screen.getByRole('link',{name:'Sign in to save progress'}).getAttribute('href')).toBe('/login?next=%2Fdashboard');
 expect(document.querySelector('input[type=password]')).toBeNull();
});
