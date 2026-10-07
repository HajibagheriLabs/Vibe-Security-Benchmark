import Navbar from './Navbar';

const App = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      
      {/* Demo content to show scroll behavior */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <section id="home" className="py-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Home Section</h1>
          <p className="text-gray-600">
            Scroll down to see the sticky navbar in action. Resize the window
            to test the responsive mobile menu.
          </p>
        </section>
        <section id="about" className="py-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">About Section</h2>
          <p className="text-gray-600">Content goes here...</p>
        </section>
        <section id="services" className="py-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Services Section</h2>
          <p className="text-gray-600">Content goes here...</p>
        </section>
        <section id="portfolio" className="py-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Portfolio Section</h2>
          <p className="text-gray-600">Content goes here...</p>
        </section>
        <section id="contact" className="py-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Contact Section</h2>
          <p className="text-gray-600">Content goes here...</p>
        </section>
      </main>
    </div>
  );
};

export default App;