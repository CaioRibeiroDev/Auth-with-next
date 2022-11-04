import axios, { AxiosError } from 'axios';
import { parseCookies, setCookie } from 'nookies';
import { signOut } from '../contexts/AuthContext';
import { AuthTokenError } from './errors/AuthTokenError';

interface AxiosErrorResponse {
  code?: string;
}

let isRefreshing = false
let failedRequestQueue = []

export function setupAPIClient(ctx = undefined) {
  let cookies = parseCookies(ctx)
  
  const api = axios.create({
    baseURL: 'http://localhost:3333',
    headers: {
      Authorization: `Bearer ${cookies['nextauth.token']}`
    }
  })

  api.interceptors.response.use(response => {
    return response
  }, (error: AxiosError<AxiosErrorResponse>) => {
  if(error.response.status === 401) {
    if(error.response.data?.code === 'token.expired'){
      cookies = parseCookies(ctx); //atualiza cookies
      
      //renovar o token
      const { 'nextauth.refreshToken': refreshToken } = cookies
      const originalConfig = error.config //config é toda a configuração da requisição que foi feita para o back-end

      if(!isRefreshing) {
        isRefreshing = true

        api.post('/refresh', {
          refreshToken,
        }).then(response => {
          const { token } = response.data
  
          setCookie(ctx, 'nextauth.token', token, {
            maxAge: 60 * 60 * 24 * 30, // 30 days
            path: '/' // quais caminhos vão ter acesso a esse cookie. "/" <== qualquer caminho tem acesso
          })
    
          setCookie(ctx, 'nextauth.refreshToken', response.data.refreshToken, {
            maxAge: 60 * 60 * 24 * 30, // 30 days
            path: '/' // quais caminhos vão ter acesso a esse cookie. "/" <== qualquer caminho tem acesso
          })
  
          api.defaults.headers['Authorization'] = `Bearer ${token}`

          failedRequestQueue.forEach(request => request.onSuccess(token))
          failedRequestQueue = []
        }).catch(err => {
          failedRequestQueue.forEach(request => request.onFailure(err))
          failedRequestQueue = []

          if(typeof window !== 'undefined') {
            signOut()
          }else {
            return Promise.reject(new AuthTokenError())
          }
        }).finally(() => {
          isRefreshing = false
        })
      }

      return new Promise((resolve, reject) => {
        failedRequestQueue.push({
          onSuccess: (token: string) => {
            originalConfig.headers['Authorization'] = `Bearer ${token}`

            resolve(api(originalConfig))
          },
          onFailure: (err: AxiosError) => {
            reject(err)
          }
        })
      })
    }else {
      if(typeof window !== 'undefined') {
        signOut()
      } else {
        return Promise.reject(new AuthTokenError())
      }
    }
  }

  return Promise.reject(error)
})

 return api
}