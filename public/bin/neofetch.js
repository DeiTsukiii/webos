import { commands } from "./all.js";

function getGpuName() {
     const regex = /(NVIDIA|AMD|Intel|Apple)(.*?)\s*\(/;

     const canvas = document.createElement('canvas');
     const gl = canvas.getContext('webgl');
     const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
     const fullString = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);

     const match = fullString.match(regex);

     if (match && match[1] && match[2]) {
          return (match[1] + match[2]).trim();
     }

     return "Unknown GPU";
}

export async function neofetchMain(data) {
     
     const { ctx, token } = data;

     const gpu = getGpuName();

     let dataStorage;

     try {
          const response = await fetch(`/api/storage?token=${encodeURIComponent(token)}`);
          dataStorage = await response.json();

          if (!dataStorage.success) throw new Error(dataStorage.message);
     } catch (error) {
          if (error.message === 'tokenError') window.location.href = '/login';

          dataStorage = {
               total_db: 'N/A',
               user_home_content: 0,
               user_quota: 5
          };
     }

     return `           \e[94m%%%%%%%%%%%%%\e[97m              \e[32m${ctx.myUsername}\e[97m@\e[32mwebos\e[94m
        %%%%%%%  %  %%%%%%%%\e[97m          ---------------------\e[94m
     %%%   %%    %    %%   %%%\e[97m        \e[32mOS\e[97m: WebOS (Node.js / Browser)\e[94m
    %%%% %%%     %     %%% %%%%\e[97m       \e[32mHost\e[97m: Netlify \e[94m
  %%    %% %%%%%%%%%%%%% %%    %%\e[97m     \e[32mKernel\e[97m: Browser (V8 Engine)\e[94m
 %%    %%                  %%   %%\e[97m    \e[32mUptime\e[97m: ${'1 min'}\e[94m
%%%   %%  \e[32m***         ***\e[94m   %%  %%%\e[97m   \e[32mPackages\e[97m: ${Object.keys(commands).length}\e[94m
%%  %%%   \e[32m****       ****\e[94m   %%%  %%\e[97m   \e[32mShell\e[97m: bash.js 1.0.0\e[94m
%%  %%%    \e[32m***  ***  ***\e[94m     %%  %%\e[97m   \e[32mResolution\e[97m: ${window.innerWidth}x${window.innerHeight}\e[94m
%%%%%%      \e[32m*** *** ***\e[94m      %%%%%%\e[97m   \e[32mDE\e[97m: WebOS UI (DOM)\e[94m
%%  %%%      \e[32m*********\e[94m      %%%  %%\e[97m   \e[32mTerminal\e[97m: WebOS Terminal\e[94m
%%   %%       \e[32m*******\e[94m       %%   %%\e[97m   \e[32mCPU\e[97m: ${navigator.hardwareConcurrency} cores\e[94m
%%%   %%                    %%  %%%\e[97m   \e[32mGPU\e[97m: ${gpu}\e[94m
 %%    %%        \e[32m*\e[94m         %%   %%\e[97m    \e[32mUser Storage\e[97m: ${dataStorage.user_home_content}MB / ${dataStorage.user_quota}MB\e[94m
  %%    %% %%%%%   %%%%% %%    %%\e[97m     \e[32mTotal Storage\e[97m: ${dataStorage.total_db}MB / 500MB\e[94m
    %%%% %%%     \e[32m*\e[94m     %%% %%%%
     %%%   %%         %%   %%%
        %%%%%%%  %  %%%%%%%%          \e[100m   \e[0m\e[101m   \e[0m\e[102m   \e[0m\e[103m   \e[0m\e[104m   \e[0m\e[105m   \e[0m\e[106m   \e[0m\e[107m   \e[0m
           %%%%%%%%%%%%%              \e[40m   \e[0m\e[41m   \e[0m\e[42m   \e[0m\e[43m   \e[0m\e[44m   \e[0m\e[45m   \e[0m\e[46m   \e[0m\e[47m   \e[0m
     `;
}