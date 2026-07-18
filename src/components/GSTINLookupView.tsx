import React, { useState } from 'react';
import { Search, Building2, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react';

interface GSTINResult {
  businessName: string;
  address: string;
  pincode: string;
}

export const GSTINLookupView: React.FC = () => {
  const [gstin, setGstin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GSTINResult | null>(null);

  const handleSearch = async () => {
    // Basic 15-character validation
    const trimmedGstin = gstin.trim();
    if (trimmedGstin.length !== 15) {
      setError('GSTIN must be exactly 15 characters long.');
      setResult(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      let response;
      try {
        response = await fetch('/api/verify-gstin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            gstin: trimmedGstin
          })
        });
      } catch (err) {
        console.error("Network error:", err);
        throw new Error("Cannot connect to the server. It might be starting up, please try again in a moment.");
      }

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("Invalid response from server:", text);
        throw new Error('Received an invalid response from the server. Please check your API configuration.');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify GSTIN or invalid GSTIN provided.');
      }

      const sourceOutput = data?.result?.source_output || data?.data || data;
      
      const businessName = sourceOutput?.legal_name || sourceOutput?.legalName || sourceOutput?.businessName || 'N/A';
      
      let address = 'N/A';
      let pincode = 'N/A';

      if (sourceOutput?.principal_place_of_business_fields?.principal_place_of_business_address) {
         const addrObj = sourceOutput.principal_place_of_business_fields.principal_place_of_business_address;
         const parts = [addrObj.door_number, addrObj.floor_number, addrObj.building_name, addrObj.street, addrObj.city, addrObj.state_name].filter(Boolean);
         if (parts.length > 0) {
           address = parts.join(', ');
         }
         if (addrObj.pincode) {
           pincode = addrObj.pincode;
         }
      } else {
         address = sourceOutput?.pradr?.adr || sourceOutput?.address || 'N/A';
         if (sourceOutput?.pradr?.pncd) {
           pincode = sourceOutput.pradr.pncd;
         } else if (sourceOutput?.pincode) {
           pincode = sourceOutput.pincode;
         } else if (typeof address === 'string') {
           const pinMatch = address.match(/\b\d{6}\b/);
           if (pinMatch) {
             pincode = pinMatch[0];
           }
         }
      }

      setResult({
        businessName,
        address,
        pincode
      });

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while verifying the GSTIN.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-4 md:p-8 bg-slate-50 overflow-y-auto">
      <div className="max-w-3xl w-full mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold text-blue-900 tracking-tight flex items-center gap-3">
            <Search className="w-8 h-8 text-blue-600" />
            GSTIN Lookup Tool
          </h2>
          <p className="text-slate-500 font-medium">Verify GST Identification Numbers and extract business details quickly.</p>
        </div>

        {/* Search Card */}
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-blue-100 shadow-sm flex flex-col gap-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="gstin-input" className="sr-only">Enter GSTIN</label>
              <input
                id="gstin-input"
                type="text"
                placeholder="Enter 15-digit GSTIN"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                maxLength={15}
                className="w-full px-5 py-4 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 font-medium text-lg uppercase placeholder:normal-case"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch();
                }}
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isLoading || gstin.trim().length === 0}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-sm shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Search & Verify
                </>
              )}
            </button>
          </div>

          {/* Hidden Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-xl border border-red-100">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-semibold">{error}</p>
            </div>
          )}
        </div>

        {/* Results Card - Hidden by default */}
        {result && (
          <div className="bg-white p-6 md:p-8 rounded-2xl border border-blue-100 shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
              <h3 className="text-xl font-bold text-slate-800">Verification Successful</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <Building2 className="w-4 h-4" />
                  <p className="text-xs font-bold uppercase tracking-wider">Business Name</p>
                </div>
                <p className="text-lg font-semibold text-slate-800">{result.businessName}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <MapPin className="w-4 h-4" />
                  <p className="text-xs font-bold uppercase tracking-wider">Pincode</p>
                </div>
                <p className="text-lg font-semibold text-slate-800">{result.pincode}</p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <MapPin className="w-4 h-4" />
                  <p className="text-xs font-bold uppercase tracking-wider">Complete Address</p>
                </div>
                <p className="text-base font-medium text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {result.address}
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
