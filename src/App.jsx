import { Routes, Route, Link } from 'react-router-dom';

function Home() {
  return <h1>Home Page</h1>;
}

function About() {
  return <h1>About Page</h1>;
}

function Settings() {
  return <h1>Settings Page</h1>;
}

function NotFound() {
  return <h1>404 - Page Not Found</h1>;
}

function App() {
  return (
    <div className="flex flex-col items-center min-h-screen p-4">
      {/* Navigation */}
      <nav className="mb-4">
        <ul className="flex gap-5 list-none p-0">
          <li><Link to="/" className="text-blue-500 hover:text-blue-700">Home</Link></li>
          <li><Link to="/about" className="text-blue-500 hover:text-blue-700">About</Link></li>
          <li><Link to="/settings" className="text-blue-500 hover:text-blue-700">Settings</Link></li>
        </ul>
      </nav>

      {/* Routes */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

export default App;
