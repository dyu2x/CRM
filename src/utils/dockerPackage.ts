export async function createDeploymentZip(): Promise<Blob> {
  const response = await fetch('/mesina_crm_v1.00_docker_bundle.zip', { cache: 'no-store' });
  if (!response.ok) throw new Error('The V2.07 Docker bundle is not present in this release.');
  return await response.blob();
}
