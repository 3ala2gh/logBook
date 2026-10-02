import { LogDemoPage } from '@/pages/log-demo/LogDemoPage'
import { PlannerPage } from '@/pages/planner/PlannerPage'

const LOG_DEMO_PATH = '/demo/log'

// Two pages don't need a router; /demo/log shows the FMCSA golden example.
export default function App() {
  const path = window.location.pathname.replace(/\/$/, '')
  return path === LOG_DEMO_PATH ? <LogDemoPage /> : <PlannerPage />
}
