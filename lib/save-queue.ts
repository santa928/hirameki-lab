export type SaveStatus='saving'|'saved'|'failed';
/** Coordinate requests by immutable session ID, including retries. */
export function createSaveQueue<T extends {id:string}>(persist:(record:T)=>Promise<void>,onStatus:(id:string,status:SaveStatus,record:T)=>void){
 const active=new Map<string,Promise<void>>();
 return (record:T):Promise<void>=>{
  const previous=active.get(record.id);if(previous)return previous;
  onStatus(record.id,'saving',record);
  const task=(async()=>{try{await persist(record);onStatus(record.id,'saved',record);}catch{onStatus(record.id,'failed',record);}finally{active.delete(record.id);}})();
  active.set(record.id,task);return task;
 };
}
