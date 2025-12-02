import { Helmet } from 'react-helmet-async';
import { Layout } from '@/components/Layout';
import { DemoBuilder } from '@/components/DemoBuilder/DemoBuilder';

const Index = () => {
  return (
    <>
      <Helmet>
        <title>Flowtide - Create Interactive Product Demos</title>
        <meta
          name="description"
          content="Build beautiful, interactive product demos in minutes. Record screens, add annotations, and share with your team."
        />
      </Helmet>
      <Layout>
        <DemoBuilder />
      </Layout>
    </>
  );
};

export default Index;
