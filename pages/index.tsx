import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>Three.js Demos</title>
        <meta name="description" content="Collection of Three.js demos" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-center">Mid-Term Project</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">


          <Link href="/virtual-world" className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <h2 className="text-2xl font-semibold mb-2">My virtual world</h2>
            <p className="text-gray-600">Interactive character with controls</p>
          </Link>


        </div>
      </main>
    </div>
  );
};

export default Home;