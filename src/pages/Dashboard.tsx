import { Helmet } from 'react-helmet-async';
import { Layout } from '@/components/Layout';
import { DemoBuilder } from '@/components/DemoBuilder/DemoBuilder';

const Dashboard = () => {
  return (
    <>
      <Helmet>
        <title>Dashboard - Flowtide</title>
      </Helmet>
      <Layout>
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            This is a test page for playbook triggers
          </p>
        </div>
        <DemoBuilder />
      </Layout>
    </>
  );
};

export default Dashboard;