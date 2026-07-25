import { DM_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { UIProvider } from "@/context/UIContext";

// Enforce DD/MM/YYYY date format globally for both SSR and client-side rendering
Date.prototype.toLocaleDateString = function () {
  const day = String(this.getDate()).padStart(2, '0');
  const month = String(this.getMonth() + 1).padStart(2, '0');
  const year = this.getFullYear();
  return `${day}/${month}/${year}`;
};

Date.prototype.toLocaleString = function () {
  const day = String(this.getDate()).padStart(2, '0');
  const month = String(this.getMonth() + 1).padStart(2, '0');
  const year = this.getFullYear();
  const rawHours = this.getHours();
  const minutes = String(this.getMinutes()).padStart(2, '0');
  const ampm = rawHours >= 12 ? 'PM' : 'AM';
  const hours = String(rawHours % 12 || 12).padStart(2, '0');
  return `${day}/${month}/${year}, ${hours}:${minutes} ${ampm}`;
};

const dmSans = DM_Sans({ 
  subsets: ["latin"], 
  variable: "--font-dm-sans",
  weight: ['400', '500', '600', '700']
});

export async function generateMetadata() {
  try {
    let apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
    if (apiUrl.endsWith('/api/')) {
      apiUrl = apiUrl.slice(0, -1);
    } else if (!apiUrl.endsWith('/api')) {
      apiUrl = `${apiUrl}/api`;
    }
    const apiRes = await fetch(`${apiUrl}/super-admin/settings/public`, { next: { revalidate: 60 } });
    const json = await apiRes.json();
    const appName = json?.data?.appName || 'goJim';
    return {
      title: `${appName} - Gym Management Platform`,
      description: `Simplify your fitness business with ${appName}. Track members, payments, attendance, and grow your gym effortlessly.`,
      keywords: "gym management, fitness, membership, attendance tracking",
    };
  } catch (error) {
    return {
      title: "goJim - Gym Management Platform",
      description: "Simplify your fitness business with goJim. Track members, payments, attendance, and grow your gym effortlessly.",
      keywords: "gym management, fitness, membership, attendance tracking",
    };
  }
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={dmSans.variable}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#0a0a0a" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="antialiased">
        <AuthProvider>
          <UIProvider>
            {children}
          </UIProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
