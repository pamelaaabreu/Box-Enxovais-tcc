import { TestBed } from '@angular/core/testing';
import Swal from 'sweetalert2/dist/sweetalert2.esm.js';
import { SweetAlertService } from './sweet-alert.service';
describe('Legacy alert HTML safety',()=>{
 it('escapes identity text without changing the login link',()=>{const fire=spyOn(Swal,'fire');TestBed.inject(SweetAlertService).showEmailDuplicate('<img src=x onerror=alert(1)>');const options=fire.calls.mostRecent().args[0] as unknown as {html:string};expect(options.html).toContain('&lt;img');expect(options.html).not.toContain('<img');expect(options.html).toContain('href="/login"');});
 it('escapes CPF text',()=>{const fire=spyOn(Swal,'fire');TestBed.inject(SweetAlertService).showCpfDuplicate('"<script>');const options=fire.calls.mostRecent().args[0] as unknown as {html:string};expect(options.html).toContain('&quot;&lt;script&gt;');});
});
