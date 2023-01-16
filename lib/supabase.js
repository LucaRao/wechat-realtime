import { createClient } from 'supabase-wechat-stable'


const url = "https://cf2buui5g6h66drd9go0.baseapi.memfiredb.com"
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImV4cCI6MzIxMTc1ODQ1OCwiaWF0IjoxNjczODM4NDU4LCJpc3MiOiJzdXBhYmFzZSJ9.lLVb0fQcD6_GIlAxj4cWKeREIdAhh4PL3pe6TZSPpDc"
export const supabase = createClient(url, key)