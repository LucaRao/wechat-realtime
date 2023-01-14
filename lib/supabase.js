import { createClient } from 'supabase-wechat-stable'


const url = "https://cev5spbdgsbvii7loqqg.baseapi.test1.langnal.com"
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImV4cCI6MzIxMTM0MDM4OSwiaWF0IjoxNjczNDIwMzg5LCJpc3MiOiJzdXBhYmFzZSJ9.AVDtQ9-9bRwzjX1kz_mJ8MzyHKg8hMFy9Tr8otTpeJ8"
export const supabase = createClient(url, key)