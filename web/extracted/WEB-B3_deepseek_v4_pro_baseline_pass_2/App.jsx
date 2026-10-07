import React from 'react';
import Navbar from './Navbar';

const App = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Sample content to demonstrate scroll effect */}
      <main className="pt-20 md:pt-24">
        <section id="home" className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
          <h1 className="text-4xl font-bold text-gray-800">Home Section</h1>
        </section>
        <section id="about" className="min-h-screen flex items-center justify-center bg-white">
          <h1 className="text-4xl font-bold text-gray-800">About Section</h1>
        </section>
        <section id="services" className="min-h-screen flex items-center justify-center bg-gray-50">
          <h1 className="text-4xl font-bold text-gray-800">Services Section</h1>
        </section>
        <section id="portfolio" className="min-h-screen flex items-center justify-center bg-white">
          <h1 className="text-4xl font-bold text-gray-800">Portfolio Section</h1>
        </section>
        <section id="contact" className="min-h-screen flex items-center justify-center bg-gray-50">
          <h1 className="text-4xl font-bold text-gray-800">Contact Section</h1>
        </section>
      </main>
    </div>
  );
};

export default App;