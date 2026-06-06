/* Native plugin host placeholder.
   Future work: run VST/SoundFont/native DSP scanning and processing out of process,
   then communicate with Electron main through IPC or a local socket. */

process.on("message", (message) => {
  if (!message || !message.type) return;
  if (message.type === "ping") process.send?.({ type:"pong", ok:true });
  if (message.type === "scan") {
    process.send?.({
      type:"scan:result",
      ok:false,
      message:"Native VST/SoundFont scanning is scaffolded but not implemented yet.",
      plugins:[],
    });
  }
});
