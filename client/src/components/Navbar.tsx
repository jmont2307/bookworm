import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar, Nav, Container, Modal, Tab } from 'react-bootstrap';
import SignUpForm from './SignupForm';
import LoginForm from './LoginForm';

import Auth from '../utils/auth';

const AppNavbar = () => {
  // set modal display state
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Navbar bg='dark' variant='dark' expand='lg' className="py-3">
        <Container>
          <Navbar.Brand as={Link} to='/' className="d-flex align-items-center">
            <i className="fas fa-book-open me-2"></i> BookWorm
          </Navbar.Brand>
          <Navbar.Toggle aria-controls='navbar' />
          <Navbar.Collapse id='navbar'>
            <Nav className='ms-auto'>
              <Nav.Link as={Link} to='/' className="me-3">
                <i className="fas fa-search me-1"></i> Search Books
              </Nav.Link>
              {/* if user is logged in show saved books and logout */}
              {Auth.loggedIn() ? (
                <>
                  <Nav.Link as={Link} to='/saved' className="me-3">
                    <i className="fas fa-book me-1"></i> My Library
                  </Nav.Link>
                  <Nav.Link onClick={Auth.logout} className="me-3">
                    <i className="fas fa-sign-out-alt me-1"></i> Logout
                  </Nav.Link>
                </>
              ) : (
                <Nav.Link onClick={() => setShowModal(true)} className="btn btn-outline-light ms-2 py-1 px-3">
                  <i className="fas fa-user me-1"></i> Login / Sign Up
                </Nav.Link>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      {/* set modal data up */}
      <Modal
        size='lg'
        show={showModal}
        onHide={() => setShowModal(false)}
        aria-labelledby='signup-modal'
        centered>
        {/* tab container to do either signup or login component */}
        <Tab.Container defaultActiveKey='login'>
          <Modal.Header closeButton>
            <Modal.Title id='signup-modal'>
              <Nav variant='pills'>
                <Nav.Item>
                  <Nav.Link eventKey='login'>Login</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey='signup'>Sign Up</Nav.Link>
                </Nav.Item>
              </Nav>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Tab.Content>
              <Tab.Pane eventKey='login'>
                <LoginForm handleModalClose={() => setShowModal(false)} />
              </Tab.Pane>
              <Tab.Pane eventKey='signup'>
                <SignUpForm handleModalClose={() => setShowModal(false)} />
              </Tab.Pane>
            </Tab.Content>
          </Modal.Body>
        </Tab.Container>
      </Modal>
    </>
  );
};

export default AppNavbar;