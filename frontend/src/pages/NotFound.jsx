import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';
import Button from '../components/common/Button';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 rounded-2xl bg-brand-blue-light border border-brand-blue/20 flex items-center justify-center text-brand-blue mb-4 shadow-subtle">
        <FileQuestion className="w-8 h-8" />
      </div>

      <h1 className="text-4xl font-extrabold text-brand-navy tracking-tight mb-2">
        404
      </h1>

      <h2 className="text-lg font-bold text-brand-navy mb-2">
        Page Not Found
      </h2>

      <p className="text-xs sm:text-sm text-brand-text-secondary max-w-sm mb-6 leading-relaxed">
        The route you requested could not be located in the VISARTECH People system. 
        It may have been moved or does not exist.
      </p>

      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          leftIcon={ArrowLeft}
          onClick={() => navigate(-1)}
        >
          Go Back
        </Button>
        <Button
          variant="primary"
          size="sm"
          leftIcon={Home}
          onClick={() => navigate('/dashboard')}
        >
          Dashboard Home
        </Button>
      </div>
    </div>
  );
}
