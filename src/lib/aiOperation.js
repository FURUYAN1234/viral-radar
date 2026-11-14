// Each user action owns its signal. Old work cannot join a later action.
export function abortable(promise, signal) {
  signal?.throwIfAborted();
  if (!signal) return promise;
  return new Promise((resolve,reject)=>{
    const stop=()=>reject(signal.reason ?? new DOMException('AI通信を中断しました','AbortError'));
    signal.addEventListener('abort',stop,{once:true});
    Promise.resolve(promise).then(value=>{signal.throwIfAborted();return value;}).then(resolve,reject).finally(()=>signal.removeEventListener('abort',stop));
  });
}
export function createAiOperationManager(onChange=()=>{}) {
  let current=null, stopped=false;
  const state=()=>({active:!!current&&!current.signal.aborted,stopped});
  return {
    state,
    begin(){
      if(current&&!current.signal.aborted)throw new Error('AI通信中です。完了または中断してから実行してください。');
      const controller=new AbortController();stopped=false;
      const op={signal:controller.signal,check:()=>controller.signal.throwIfAborted(),isCurrent:()=>current===op,finish:()=>{if(current===op){current=null;onChange(state());}},cancel:()=>controller.abort(new DOMException('AI通信を中断しました','AbortError'))};
      current=op;onChange(state());return op;
    },
    stop(){if(current){stopped=true;current.cancel();onChange(state());}},
  };
}
