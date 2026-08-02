import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { HelmetProvider } from 'react-helmet-async';
import AppRouter from './routes/AppRouter';

function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        
        {/* আমাদের তৈরি করা রাউটার (AppRouter) এখানে কাজ করবে, যা Home পেজ এবং Admin পেজ দেখাবে */}
        <AppRouter />
        
        {/* গ্লোবাল নোটিফিকেশন (Toast) সেটআপ */}
        <Toaster 
          position="top-center" 
          toastOptions={{
            style: {
              background: '#222222',
              color: '#fff',
              border: '1px solid #D4AF37',
            },
          }} 
        />
        
      </BrowserRouter>
    </HelmetProvider>
  );
}

export default App;