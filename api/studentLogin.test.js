import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStudentProfile } from '../src/lib/studentProfile'
import { hashPasswordWithSalt } from './_studentPassword'
const records = vi.hoisted(() => new Map())
vi.mock('@vercel/kv', () => ({ kv: { get: vi.fn(async key => structuredClone(records.get(key) ?? null)), exists: vi.fn(async key => records.has(key) ? 1 : 0), smembers: vi.fn(async key => [...(records.get(key) || [])]), set: vi.fn(async (key, value) => records.set(key, value)) } }))
import handler from './student-login'
async function call(method = 'POST', body = {}, query = {}) { const res = { code: 200, headers: {}, setHeader(k,v){this.headers[k]=v}, status(c){this.code=c;return this}, json(d){this.data=d;return this}, end(){return this} }; await handler({ method, body, query, headers: {} }, res); return res }
beforeEach(() => { records.clear(); records.set('classes:index',['a']); records.set('class:a',{id:'a',name:'6A',loginToken:'class-token'}); const profile=createStudentProfile('ANNA','Anna'); profile.classId='a'; profile.classIds=['a']; profile.auth={passwordScheme:'sha256-v1',passwordSalt:'salt',passwordHash:hashPasswordWithSalt('1234','salt')}; records.set('student:ANNA',profile); records.set('students:index',['ANNA']) })
describe('class link login', () => {
 it('reveals only the linked class', async () => { expect(await call('GET',{}, {class:'class-token'})).toMatchObject({code:200,data:{className:'6A'}}) })
 it('requires name and four digit code for the linked class', async () => { const result=await call('POST',{classToken:'class-token',name:'Anna',code:'1234',remember:true}); expect(result).toMatchObject({code:200,data:{studentId:'ANNA',classId:'a'}}); expect(result.data.sessionSecret).toMatch(/^st_/) })
 it('rejects an incorrect code or invalid link', async () => { expect((await call('POST',{classToken:'class-token',name:'Anna',code:'0000'})).code).toBe(401); expect((await call('GET',{}, {class:'bad'})).code).toBe(404) })
})