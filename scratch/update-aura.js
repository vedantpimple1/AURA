const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/components/aura/aura-app.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Imports
content = content.replace(
  'import { awardAuraAction, redeemAuraAction } from "@/actions/aura.actions";',
  'import { awardAuraAction, redeemAuraAction } from "@/actions/aura.actions";\nimport { createTaskAction, submitTaskAction, reviewTaskAction } from "@/actions/task.actions";'
);

// 2. Component signature
content = content.replace(
  'export function AuraApp({ initialRole = "Member", userName = "", initialUsers = [], initialAuraBalance = 0, initialHistory = [] }: { initialRole?: string, userName?: string, initialUsers?: any[], initialAuraBalance?: number, initialHistory?: any[] }) {',
  'export function AuraApp({ initialRole = "Member", userName = "", initialUsers = [], initialAuraBalance = 0, initialHistory = [], initialTasks = [] }: { initialRole?: string, userName?: string, initialUsers?: any[], initialAuraBalance?: number, initialHistory?: any[], initialTasks?: any[] }) {'
);

// 3. States
content = content.replace(
  'const [task,setTask]=useState<Task|null>(null); const [toast,setToast]=useState(""); const [showAddUser, setShowAddUser]=useState(false); const [showAwardAura, setShowAwardAura]=useState(false);',
  'const [task,setTask]=useState<any|null>(null); const [toast,setToast]=useState(""); const [showAddUser, setShowAddUser]=useState(false); const [showAwardAura, setShowAwardAura]=useState(false); const [showCreateTask, setShowCreateTask]=useState(false);'
);

// 4. Main Views
content = content.replace(
  '<main className="mx-auto max-w-7xl px-5 pb-24 pt-7 sm:px-8 lg:pb-10">{page==="home"&&(role==="Member"?<MemberHome go={setPage} open={setTask} balance={initialAuraBalance}/>:<AdminHome superadmin={role==="Superadmin"} go={setPage} openAward={()=>setShowAwardAura(true)}/>)}{page==="tasks"&&<Tasks open={setTask} admin={role!=="Member"}/>} {page==="reviews"&&<Reviews notify={notify}/>}',
  '<main className="mx-auto max-w-7xl px-5 pb-24 pt-7 sm:px-8 lg:pb-10">{page==="home"&&(role==="Member"?<MemberHome go={setPage} open={setTask} balance={initialAuraBalance} initialTasks={initialTasks}/>:<AdminHome superadmin={role==="Superadmin"} go={setPage} openAward={()=>setShowAwardAura(true)} openCreateTask={()=>setShowCreateTask(true)} initialTasks={initialTasks}/>)}{page==="tasks"&&<Tasks open={setTask} admin={role!=="Member"} openCreateTask={()=>setShowCreateTask(true)} initialTasks={initialTasks}/>} {page==="reviews"&&<Reviews notify={notify} initialTasks={initialTasks}/>}'
);

// 5. Modals
content = content.replace(
  '{task&&<TaskModal task={task} close={()=>setTask(null)} notify={notify}/>}',
  '{showCreateTask&&<CreateTaskModal close={()=>setShowCreateTask(false)} notify={notify} onSuccess={()=>{setShowCreateTask(false); window.location.reload()}} users={initialUsers}/>} {task&&<TaskModal task={task} close={()=>setTask(null)} notify={notify} onSuccess={()=>{setTask(null); window.location.reload()}} role={role}/>}'
);

// 6. MemberHome
content = content.replace(
  'function MemberHome({go,open,balance}:{go:(p:Page)=>void;open:(t:Task)=>void;balance?:number}){',
  'function MemberHome({go,open,balance,initialTasks}:{go:(p:Page)=>void;open:(t:any)=>void;balance?:number;initialTasks?:any[]}){'
);
content = content.replace(
  '<TaskList open={open}/>',
  '<TaskList open={open} initialTasks={initialTasks}/>'
);

// 7. AdminHome
content = content.replace(
  'function AdminHome({superadmin,go,openAward}:{superadmin:boolean;go:(p:Page)=>void;openAward:()=>void}){',
  'function AdminHome({superadmin,go,openAward,openCreateTask,initialTasks}:{superadmin:boolean;go:(p:Page)=>void;openAward:()=>void;openCreateTask:()=>void;initialTasks?:any[]}){'
);
content = content.replace(
  '<Button variant="outline" onClick={()=>go("tasks")}><Plus className="mr-2 h-4 w-4"/>Create task</Button>',
  '<Button variant="outline" onClick={openCreateTask}><Plus className="mr-2 h-4 w-4"/>Create task</Button>'
);
content = content.replace(
  '<b>Tasks awaiting review</b>{tasks.slice(0,3).map((t,i)=><div className="mt-4 flex items-center gap-3" key={t.title}><Avatar name={members[i+1]}/><span className="flex-1 text-sm"><b>{t.title}</b><small className="block text-zinc-500">Submitted today · {t.points} Aura</small></span><button onClick={()=>go("reviews")} className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white">Review</button></div>)}',
  '<b>Tasks awaiting review</b>{(initialTasks||[]).filter((t:any)=>t.assignments?.some((a:any)=>a.status==="SUBMITTED")).slice(0,3).map((t:any,i:number)=><div className="mt-4 flex items-center gap-3" key={t.id}><span className="flex-1 text-sm"><b>{t.title}</b><small className="block text-zinc-500">Submitted recently · {t.baseAura} Aura</small></span><button onClick={()=>go("reviews")} className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white">Review</button></div>)}'
);

// 8. TaskList
content = content.replace(
  'function TaskList({open}:{open:(t:Task)=>void}){return <Card className="p-5"><b>Your tasks</b>{tasks.slice(0,3).map(t=><button onClick={()=>open(t)} key={t.title} className="mt-4 flex w-full items-center gap-3 text-left"><span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-50"><Target className="h-4 w-4 text-orange-600"/></span><span className="flex-1"><b className="block text-sm">{t.title}</b><small className="text-zinc-500">{t.due} · {t.points} Aura</small></span><Pill>{t.status}</Pill></button>)}</Card>}',
  'function TaskList({open,initialTasks}:{open:(t:any)=>void;initialTasks?:any[]}){return <Card className="p-5"><b>Your tasks</b>{(!initialTasks || initialTasks.length===0)?<div className="py-8 text-center text-zinc-500">No tasks assigned yet.</div>:initialTasks.slice(0,5).map(a=><button onClick={()=>open(a)} key={a.id} className="mt-4 flex w-full items-center gap-3 text-left"><span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-50"><Target className="h-4 w-4 text-orange-600"/></span><span className="flex-1"><b className="block text-sm">{a.task.title}</b><small className="text-zinc-500">{a.task.baseAura} Aura</small></span><Pill>{a.status}</Pill></button>)}</Card>}'
);

// 9. Tasks
content = content.replace(
  'function Tasks({open,admin}:{open:(t:Task)=>void;admin:boolean}){return <><Head title={admin?"Task workspace":"Tasks that move things forward"} copy="Mock tasks, filters, details, and review states." action={admin?<Button><Plus className="mr-2 h-4 w-4"/>New task</Button>:undefined}/><div className="mb-5 flex gap-2 overflow-auto">{["All tasks","In Progress","Not Started","Needs Changes","Submitted"].map((x,i)=><button key={x} className={cn("whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold",i?"bg-white ring-1 ring-zinc-200":"bg-zinc-900 text-white")}>{x}</button>)}</div><div className="grid gap-4 md:grid-cols-2">{tasks.map(t=><Card className="p-5" key={t.title}><div className="flex justify-between"><Pill>{t.status}</Pill><b className="text-orange-600">{t.points} Aura</b></div><h3 className="mt-4 text-lg font-bold">{t.title}</h3><p className="mt-2 text-sm text-zinc-500">{t.description}</p><div className="mt-5 flex justify-between border-t pt-4 text-xs text-zinc-500">{t.due}<button onClick={()=>open(t)} className="font-bold text-orange-600">View task <ChevronRight className="inline h-4 w-4"/></button></div></Card>)}</div></>}',
  'function Tasks({open,admin,openCreateTask,initialTasks}:{open:(t:any)=>void;admin:boolean;openCreateTask:()=>void;initialTasks?:any[]}){return <><Head title={admin?"Task workspace":"Tasks that move things forward"} copy="Tasks, filters, details, and review states." action={admin?<Button onClick={openCreateTask}><Plus className="mr-2 h-4 w-4"/>New task</Button>:undefined}/><div className="mb-5 flex gap-2 overflow-auto">{["All tasks"].map((x,i)=><button key={x} className={cn("whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold",i?"bg-white ring-1 ring-zinc-200":"bg-zinc-900 text-white")}>{x}</button>)}</div><div className="grid gap-4 md:grid-cols-2">{(!initialTasks || initialTasks.length===0)?<p>No tasks found.</p>:(admin?initialTasks:initialTasks.map((a:any)=>a.task)).map((t:any, idx:number)=><Card className="p-5" key={t.id||idx}><div className="flex justify-between"><Pill>{admin?t.status:initialTasks![idx].status}</Pill><b className="text-orange-600">{t.baseAura} Aura</b></div><h3 className="mt-4 text-lg font-bold">{t.title}</h3><p className="mt-2 text-sm text-zinc-500">{t.description}</p><div className="mt-5 flex justify-between border-t pt-4 text-xs text-zinc-500"><button onClick={()=>open(admin?t:initialTasks![idx])} className="font-bold text-orange-600">View task <ChevronRight className="inline h-4 w-4"/></button></div></Card>)}</div></>}'
);

// 10. Reviews
content = content.replace(
  'function Reviews({notify}:{notify:(s:string)=>void}){return <><Head title="Review portal" copy="A focused queue for reviewing the team’s submitted work."/><Card className="overflow-auto"><div className="hidden min-w-[720px] grid-cols-[1.1fr_1.8fr_1fr_.8fr_1fr_.7fr] gap-4 border-b bg-orange-50/50 px-5 py-3 text-xs font-bold uppercase tracking-wide text-zinc-500 md:grid"><span>Member</span><span>Task</span><span>Submitted</span><span>Aura</span><span>Status</span><span>Action</span></div>{tasks.map((t,i)=><div className="grid gap-3 border-b p-4 last:border-0 md:grid-cols-[1.1fr_1.8fr_1fr_.8fr_1fr_.7fr] md:items-center md:px-5" key={t.title}><span className="flex items-center gap-2"><Avatar name={members[i+1]}/><b className="text-sm">{members[i+1]}</b></span><span><b className="block text-sm">{t.title}</b><small className="text-zinc-500">{i===1?"Monthly":"General"} task</small></span><small>14 Sep</small><b className="text-orange-600">{(i+2)*1000},000</b><Pill>Pending Review</Pill><Button size="sm" onClick={()=>notify("Review opened — mock only")}>Review</Button></div>)}</Card></>}',
  'function Reviews({notify,initialTasks}:{notify:(s:string)=>void;initialTasks?:any[]}){async function handleApprove(submissionId:string){notify("Approving...");const fd=new FormData();fd.append("submissionId",submissionId);fd.append("status","APPROVED");const res=await reviewTaskAction(fd);if(res.success){notify("Task approved and Aura awarded!");setTimeout(()=>window.location.reload(),1000)}else{notify((res as any).error||"Failed to approve")}}return <><Head title="Review portal" copy="A focused queue for reviewing the team’s submitted work."/><Card className="overflow-auto"><div className="hidden min-w-[720px] grid-cols-[1.1fr_1.8fr_1fr_.8fr_1fr_.7fr] gap-4 border-b bg-orange-50/50 px-5 py-3 text-xs font-bold uppercase tracking-wide text-zinc-500 md:grid"><span>Member</span><span>Task</span><span>Submitted</span><span>Aura</span><span>Status</span><span>Action</span></div>{(initialTasks||[]).flatMap((t:any)=>t.assignments).filter((a:any)=>a.status==="SUBMITTED"&&a.submissions?.length>0).map((a:any)=><div className="grid gap-3 border-b p-4 last:border-0 md:grid-cols-[1.1fr_1.8fr_1fr_.8fr_1fr_.7fr] md:items-center md:px-5" key={a.id}><span className="flex items-center gap-2"><b className="text-sm">{a.user?.name||"Unknown"}</b></span><span><b className="block text-sm">Task</b><small className="text-zinc-500">Submission</small></span><small>Today</small><b className="text-orange-600">Aura</b><Pill>Pending Review</Pill><Button size="sm" onClick={()=>handleApprove(a.submissions[0].id)}>Approve</Button></div>)}</Card></>}'
);

// 11. TaskModal (Submit)
content = content.replace(
  'function TaskModal({task,close,notify}:{task:Task;close:()=>void;notify:(s:string)=>void}){return <div className="fixed inset-0 z-30 grid place-items-end bg-zinc-900/30 sm:place-items-center"><Card className="w-full max-w-xl rounded-b-none p-6 sm:rounded-3xl"><div className="flex justify-between"><Pill>{task.status}</Pill><button onClick={close}><X className="h-5 w-5"/></button></div><h2 className="mt-5 text-2xl font-bold">{task.title}</h2><p className="mt-3 leading-7 text-zinc-500">{task.description}</p><div className="mt-5 grid grid-cols-3 rounded-xl bg-zinc-50 p-4 text-center text-sm"><span>{task.points}<small className="block text-zinc-500">Aura</small></span><span>{task.due}<small className="block text-zinc-500">Deadline</small></span><span>{task.reviewer}<small className="block text-zinc-500">Reviewer</small></span></div><div className="mt-5 rounded-xl border border-dashed p-4 text-sm text-zinc-500">Submission notes and evidence/reference links appear here.</div><div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={close}>Save draft</Button><Button onClick={()=>{notify("Mock submission sent for review");close()}}>Submit for Review</Button></div></Card></div>}',
  'function TaskModal({task,close,notify,onSuccess,role}:{task:any;close:()=>void;notify:(s:string)=>void;onSuccess:()=>void;role:string}){const [loading,setLoading]=useState(false);const isAdmin=role==="Admin"||role==="Superadmin";const theTask=isAdmin?task:task.task;async function handleSubmit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setLoading(true);const fd=new FormData(e.currentTarget);fd.append("assignmentId",task.id);const res=await submitTaskAction(fd);if(res.success){notify("Task submitted successfully!");onSuccess()}else{notify((res as any).error||"Failed to submit task");setLoading(false)}}return <div className="fixed inset-0 z-30 grid place-items-end bg-zinc-900/30 sm:place-items-center"><Card className="w-full max-w-xl rounded-b-none p-6 sm:rounded-3xl"><div className="flex justify-between"><Pill>{task.status}</Pill><button onClick={close}><X className="h-5 w-5"/></button></div><h2 className="mt-5 text-2xl font-bold">{theTask.title}</h2><p className="mt-3 leading-7 text-zinc-500">{theTask.description}</p><div className="mt-5 grid grid-cols-2 rounded-xl bg-zinc-50 p-4 text-center text-sm"><span>{theTask.baseAura}<small className="block text-zinc-500">Aura</small></span><span>Creator<small className="block text-zinc-500">{theTask.createdBy?.name}</small></span></div>{!isAdmin&&task.status==="ASSIGNED"&&<form onSubmit={handleSubmit} className="mt-5"><textarea required name="content" className="w-full rounded-xl border p-4 text-sm" placeholder="Submission notes or links..." rows={3}/><div className="mt-5 flex justify-end gap-2"><Button variant="outline" type="button" onClick={close}>Cancel</Button><Button type="submit" disabled={loading}>{loading?"Submitting...":"Submit for Review"}</Button></div></form>}</Card></div>}'
);

// 12. CreateTaskModal
content += '\nfunction CreateTaskModal({close,notify,onSuccess,users}:{close:()=>void;notify:(s:string)=>void;onSuccess:()=>void;users:any[]}){const [loading,setLoading]=useState(false);async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setLoading(true);const fd=new FormData(e.currentTarget);const res=await createTaskAction(fd);if(res.success){notify("Task created!");onSuccess()}else{notify((res as any).error||"Failed to create task");setLoading(false)}}return <div className="fixed inset-0 z-30 grid place-items-center bg-zinc-900/30 p-4"><Card className="w-full max-w-md p-6"><div className="flex justify-between mb-4"><h3 className="text-xl font-bold">Create Task</h3><button onClick={close}><X className="h-5 w-5"/></button></div><form onSubmit={submit} className="space-y-4"><div><label className="text-sm font-medium mb-1 block">Title</label><input required name="title" className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm"/></div><div><label className="text-sm font-medium mb-1 block">Description</label><textarea name="description" className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm" rows={2}/></div><div><label className="text-sm font-medium mb-1 block">Aura Reward</label><input required type="number" min="1" name="baseAura" className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm"/></div><div><label className="text-sm font-medium mb-1 block">Assign To (Optional)</label><select name="assigneeId" className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm"><option value="">-- No one yet --</option>{users.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></div><div className="flex justify-end gap-2 pt-2"><Button variant="outline" type="button" onClick={close}>Cancel</Button><Button type="submit" disabled={loading}>{loading?"Creating...":"Create Task"}</Button></div></form></Card></div>}';


fs.writeFileSync(filePath, content, 'utf8');
console.log('Update complete.');
