import { useState } from "react";
import { useWallet } from "../hooks/useWallet";

const ConnectButton = () => {
  const { isConnected, connect, disconnect, installedExtensions } = useWallet();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleConnect = () => {
    if (installedExtensions.length === 1) {
      connect(installedExtensions[0]);
    } else if (installedExtensions.length > 1) {
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {!isConnected ? (
          <button
            className="p-2 px-4 bg-red-900/90 hover:bg-red-800 text-zinc-100 rounded-md border border-red-900/60 text-xs font-medium transition-all focus:outline-none focus:ring-1 focus:ring-red-700/30"
            onClick={handleConnect}
          >
            Connect Wallet
          </button>
        ) : (
          <div className="flex items-center gap-2">
            {/* <span className="text-xs text-zinc-300">Connected</span> */}
            <button
              className="p-2 px-4 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 rounded-md border border-zinc-700/50 text-xs font-medium transition-all focus:outline-none focus:ring-1 focus:ring-zinc-500/30"
              onClick={() => disconnect()}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      {isModalOpen && !isConnected && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800/80 rounded-lg shadow-lg max-w-sm w-full overflow-hidden">
            <div className="px-5 py-3.5 border-b border-zinc-800/60">
              <h2 className="text-sm font-medium text-zinc-100">
                Select Wallet
              </h2>
            </div>

            <div className="p-5 space-y-3">
              {installedExtensions.map((wallet) => (
                <button
                  key={wallet}
                  className="w-full px-4 py-2 bg-zinc-800/60 text-zinc-300 rounded-md hover:bg-zinc-700 transition-all text-xs border border-zinc-700/40 font-medium focus:outline-none focus:ring-1 focus:ring-zinc-500/30 flex items-center justify-between"
                  onClick={() => {
                    connect(wallet);
                    setIsModalOpen(false);
                  }}
                >
                  <span>{wallet}</span>
                  {window.cardano?.[wallet]?.icon && (
                    <img
                      src={window.cardano[wallet].icon}
                      alt={`${wallet} logo`}
                      className="w-6 h-6 object-contain"
                    />
                  )}
                </button>
              ))}

              <button
                className="w-full px-4 py-2 bg-zinc-800/60 text-zinc-300 rounded-md hover:bg-zinc-700 transition-all text-xs border border-zinc-700/40 font-medium focus:outline-none focus:ring-1 focus:ring-zinc-500/30"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ConnectButton;